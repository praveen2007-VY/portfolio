import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, GRANT_MODES, USER_ID, type TestDatabase } from "./harness";

describe.each(GRANT_MODES)("RLS ($name)", ({ defaultGrants }) => {
let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase({ defaultGrants });
  // A draft project and a draft certificate that must never be public.
  await t.owner(`
    insert into public.projects (slug, title, is_published, sort_order) values ('secret-draft', 'Secret draft', false, 99);
    insert into public.certificates (title, issuer, is_published, pdf_path)
      values ('Draft cert', 'Issuer', false, 'certificates/pdfs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf');
    update public.certificates set pdf_path = 'certificates/pdfs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf'
      where title = 'Programming in Java';
    insert into storage.objects (bucket_id, name) values
      ('documents', 'certificates/pdfs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf'),
      ('documents', 'certificates/pdfs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf');
  `);
}, 60_000);

afterAll(() => t?.db.close());

const count = async (p: Promise<{ rows: unknown[] }>) => (await p).rows.length;

describe("seed data", () => {
  it("loads the resume content", async () => {
    const projects = await t.owner<{ slug: string }>("select slug from public.projects order by sort_order");
    expect(projects.rows.map((r) => r.slug)).toEqual([
      "sign-aura",
      "airport-shuttle-monitoring-system",
      "real-time-object-face-detection",
      "secret-draft",
    ]);
    expect(await count(t.owner("select 1 from public.certificates where issuer <> 'Issuer'"))).toBe(5);
    expect(await count(t.owner("select 1 from public.experiences"))).toBe(2);
    expect(await count(t.owner("select 1 from public.site_settings"))).toBe(2);
  });

  it("is safe to rerun and never overwrites dashboard edits", async () => {
    await t.owner("update public.projects set title = 'Sign Aura (edited)' where slug = 'sign-aura'");
    await t.owner("update public.profiles set headline = 'Edited headline'");
    await t.owner("delete from public.coding_profiles where platform = 'CodeChef'");
    await t.rerunSeed();
    const project = await t.owner<{ title: string }>("select title from public.projects where slug = 'sign-aura'");
    expect(project.rows[0].title).toBe("Sign Aura (edited)");
    const profile = await t.owner<{ headline: string }>("select headline from public.profiles");
    expect(profile.rows[0].headline).toBe("Edited headline");
    expect(await count(t.owner("select 1 from public.profiles"))).toBe(1);
    expect(await count(t.owner("select 1 from public.coding_profiles"))).toBe(1);
  });
});

describe("anonymous visitors", () => {
  it("only see published content", async () => {
    const slugs = (await t.anon<{ slug: string }>("select slug from public.projects")).rows.map((r) => r.slug);
    expect(slugs).not.toContain("secret-draft");
    expect(slugs).toContain("sign-aura");
    const certs = (await t.anon<{ title: string }>("select title from public.certificates")).rows;
    expect(certs.map((c) => c.title)).not.toContain("Draft cert");
  });

  it("only see the published site settings", async () => {
    const rows = (await t.anon<{ variant: string }>("select variant from public.site_settings")).rows;
    expect(rows).toEqual([{ variant: "published" }]);
  });

  it("cannot insert, update or delete content", async () => {
    // Visitors hold no write privileges at all, so writes fail before RLS.
    await expect(
      t.anon("insert into public.projects (slug, title, is_published) values ('x', 'X', true)"),
    ).rejects.toThrow(/permission denied/);
    await expect(t.anon("update public.projects set title = 'hacked'")).rejects.toThrow(/permission denied/);
    await expect(t.anon("delete from public.skills")).rejects.toThrow(/permission denied/);
    await expect(t.anon("update public.site_settings set hero_title = 'hacked'")).rejects.toThrow(
      /permission denied/,
    );
    await expect(t.anon("truncate public.skills cascade")).rejects.toThrow(/permission denied/);
    const settings = await t.owner<{ hero_title: string }>("select hero_title from public.site_settings");
    expect(settings.rows.every((r) => r.hero_title !== "hacked")).toBe(true);
    expect((await t.owner<{ c: number }>("select count(*)::int c from public.skills")).rows[0].c).toBeGreaterThan(0);
  });

  it("cannot read the profile table directly, and private fields stay hidden", async () => {
    await expect(t.anon("select * from public.profiles")).rejects.toThrow(/permission denied/);
    const pub = await t.anon<{ phone: string | null; email: string | null }>(
      "select phone, email from public.get_public_profile()",
    );
    expect(pub.rows[0].phone).toBeNull();
    expect(pub.rows[0].email).toBe("kit28.24bad118@gmail.com");

    await t.owner("update public.profiles set show_phone = true, show_email = false");
    const shown = await t.anon<{ phone: string | null; email: string | null }>(
      "select phone, email from public.get_public_profile()",
    );
    expect(shown.rows[0].phone).toBe("+91 9965293440");
    expect(shown.rows[0].email).toBeNull();
    await t.owner("update public.profiles set show_phone = false, show_email = true");
  });

  it("cannot read contact messages but can submit one", async () => {
    await t.anon(
      "insert into public.contact_messages (name, email, message) values ('Visitor', 'v@example.com', 'Hello there, nice work!')",
    );
    await expect(t.anon("select * from public.contact_messages")).rejects.toThrow(/permission denied/);
    await expect(
      t.anon(
        "insert into public.contact_messages (name, email, message, is_read) values ('V', 'v@example.com', 'Hello there!!', true)",
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("cannot upload files", async () => {
    await expect(
      t.anon("insert into storage.objects (bucket_id, name) values ('media', 'profile/evil.png')"),
    ).rejects.toThrow(/row-level security/);
  });

  it("can only access documents referenced by published content", async () => {
    const visible = (await t.anon<{ name: string }>("select name from storage.objects where bucket_id = 'documents'"))
      .rows;
    expect(visible.map((o) => o.name)).toEqual(["certificates/pdfs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"]);
  });
});

describe("authenticated non-admin users", () => {
  it("cannot write content", async () => {
    await expect(
      t.user("insert into public.projects (slug, title) values ('intruder', 'Intruder')"),
    ).rejects.toThrow(/row-level security/);
    expect((await t.user("update public.profiles set full_name = 'Intruder' returning id")).rows).toHaveLength(0);
    expect((await t.user("delete from public.certificates returning id")).rows).toHaveLength(0);
  });

  it("cannot grant themselves admin access", async () => {
    await expect(
      t.user(`insert into public.admin_users (user_id) values ('${USER_ID}')`),
    ).rejects.toThrow(/permission denied/);
    const isAdmin = await t.user<{ is_admin: boolean }>("select public.is_admin() as is_admin");
    expect(isAdmin.rows[0].is_admin).toBe(false);
  });

  it("do not see drafts", async () => {
    const slugs = (await t.user<{ slug: string }>("select slug from public.projects")).rows.map((r) => r.slug);
    expect(slugs).not.toContain("secret-draft");
  });

  it("cannot upload or delete storage objects", async () => {
    await expect(
      t.user("insert into storage.objects (bucket_id, name) values ('documents', 'resume/x.pdf')"),
    ).rejects.toThrow(/row-level security/);
    expect((await t.user("delete from storage.objects returning id")).rows).toHaveLength(0);
  });
});

describe("administrators", () => {
  it("see drafts and the draft settings", async () => {
    const slugs = (await t.admin<{ slug: string }>("select slug from public.projects")).rows.map((r) => r.slug);
    expect(slugs).toContain("secret-draft");
    expect(await count(t.admin("select 1 from public.site_settings"))).toBe(2);
    expect(await count(t.admin("select 1 from public.profiles"))).toBe(1);
  });

  it("can create, edit, publish and delete projects", async () => {
    const created = await t.admin<{ id: string; published_at: string | null }>(
      "insert into public.projects (slug, title, tech_stack) values ('new-one', 'New one', array['Go']) returning id, published_at",
    );
    const id = created.rows[0].id;
    expect(created.rows[0].published_at).toBeNull();
    expect((await t.anon("select 1 from public.projects where slug = 'new-one'")).rows).toHaveLength(0);

    const published = await t.admin<{ published_at: string | null }>(
      "update public.projects set is_published = true where id = $1 returning published_at",
      [id],
    );
    expect(published.rows[0].published_at).not.toBeNull();
    expect((await t.anon("select 1 from public.projects where slug = 'new-one'")).rows).toHaveLength(1);

    expect((await t.admin("delete from public.projects where id = $1 returning id", [id])).rows).toHaveLength(1);
  });

  it("can edit the profile", async () => {
    const res = await t.admin<{ full_name: string }>(
      "update public.profiles set full_name = 'Praveen R' returning full_name",
    );
    expect(res.rows).toEqual([{ full_name: "Praveen R" }]);
  });

  it("can upload and remove storage objects", async () => {
    await t.admin("insert into storage.objects (bucket_id, name) values ('media', 'profile/new.png')");
    expect(
      (await t.admin("delete from storage.objects where name = 'profile/new.png' returning id")).rows,
    ).toHaveLength(1);
  });

  it("still cannot modify the admin allowlist through the API", async () => {
    await expect(
      t.admin(`insert into public.admin_users (user_id) values ('${USER_ID}')`),
    ).rejects.toThrow(/permission denied/);
  });

  it("read contact messages", async () => {
    expect(await count(t.admin("select * from public.contact_messages"))).toBeGreaterThan(0);
  });
});

describe("constraints", () => {
  it("rejects unsafe storage paths and malformed values", async () => {
    await expect(
      t.admin("update public.projects set cover_path = '../../etc/passwd.png' where slug = 'sign-aura'"),
    ).rejects.toThrow(/check constraint/);
    await expect(
      t.admin("update public.projects set repo_url = 'javascript:alert(1)' where slug = 'sign-aura'"),
    ).rejects.toThrow(/violates check constraint/);
    await expect(
      t.admin("update public.experiences set start_date = 'May 2026'"),
    ).rejects.toThrow(/violates check constraint/);
    await expect(
      t.admin("update public.site_settings set accent = 'neon-pink'"),
    ).rejects.toThrow(/check constraint/);
  });
});
});
