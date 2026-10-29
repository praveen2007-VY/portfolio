import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_ID, createTestDatabase, GRANT_MODES, USER_ID, type TestDatabase } from "./harness";

const TABLES = [
  "admin_users",
  "profiles",
  "site_settings",
  "projects",
  "certificates",
  "achievements",
  "coding_profiles",
  "skills",
  "experiences",
  "education",
  "contact_messages",
];
const CONTENT = ["projects", "certificates", "achievements", "coding_profiles", "skills", "experiences", "education"];
const PUBLIC_READ = ["site_settings", ...CONTENT];
const PUBLIC_FUNCTIONS = ["is_admin()", "get_public_profile()", "get_public_resume()", "is_public_document(text)"];
const INTERNAL_FUNCTIONS = [
  "set_updated_at()",
  "projects_published_at()",
  "contact_messages_rate_limit()",
  "portfolio_profile_id()",
];

const PUBLISHED_PDF = "certificates/pdfs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf";
const DRAFT_PDF = "certificates/pdfs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf";
const RESUME = "resume/cccccccc-cccc-4ccc-8ccc-cccccccccccc.pdf";
const OLD_RESUME = "resume/dddddddd-dddd-4ddd-8ddd-dddddddddddd.pdf";

describe.each(GRANT_MODES)("privileges ($name)", ({ defaultGrants }) => {
  let t: TestDatabase;

  const tablePriv = async (role: string, table: string, priv: string) =>
    (
      await t.owner<{ ok: boolean }>(`select has_table_privilege('${role}', 'public.${table}', '${priv}') as ok`)
    ).rows[0].ok;
  const columnPriv = async (role: string, table: string, column: string, priv: string) =>
    (
      await t.owner<{ ok: boolean }>(
        `select has_column_privilege('${role}', 'public.${table}', '${column}', '${priv}') as ok`,
      )
    ).rows[0].ok;
  const canExecute = async (role: string, fn: string) =>
    (await t.owner<{ ok: boolean }>(`select has_function_privilege('${role}', 'public.${fn}', 'execute') as ok`))
      .rows[0].ok;
  const documentsVisibleTo = async (who: "anon" | "user") =>
    (await t[who]<{ name: string }>("select name from storage.objects where bucket_id = 'documents' order by name"))
      .rows.map((r) => r.name);

  beforeAll(async () => {
    t = await createTestDatabase({ defaultGrants });
    await t.owner(`
      insert into public.certificates (title, issuer, is_published, pdf_path)
        values ('Draft cert', 'Issuer', false, '${DRAFT_PDF}');
      update public.certificates set pdf_path = '${PUBLISHED_PDF}' where title = 'Programming in Java';
      insert into storage.objects (bucket_id, name) values
        ('documents', '${DRAFT_PDF}'), ('documents', '${PUBLISHED_PDF}'),
        ('documents', '${RESUME}'), ('documents', '${OLD_RESUME}');
    `);
  }, 60_000);

  afterAll(() => t?.db.close());

  describe("unnecessary table privileges are revoked", () => {
    it("neither API role can TRUNCATE, REFERENCE or add TRIGGERs to any table", async () => {
      for (const role of ["anon", "authenticated"]) {
        for (const table of TABLES) {
          for (const priv of ["TRUNCATE", "REFERENCES", "TRIGGER"]) {
            expect(await tablePriv(role, table, priv), `${role} ${priv} on ${table}`).toBe(false);
          }
        }
      }
    });

    it("visitors can only read public tables and submit the three contact columns", async () => {
      for (const table of TABLES) {
        expect(await tablePriv("anon", table, "SELECT"), `anon SELECT ${table}`).toBe(PUBLIC_READ.includes(table));
        for (const priv of ["UPDATE", "DELETE"]) {
          expect(await tablePriv("anon", table, priv), `anon ${priv} ${table}`).toBe(false);
        }
        if (table !== "contact_messages") {
          expect(await tablePriv("anon", table, "INSERT"), `anon INSERT ${table}`).toBe(false);
        }
      }
      for (const column of ["name", "email", "message"]) {
        expect(await columnPriv("anon", "contact_messages", column, "INSERT")).toBe(true);
      }
      for (const column of ["id", "is_read", "created_at"]) {
        expect(await columnPriv("anon", "contact_messages", column, "INSERT"), column).toBe(false);
      }
    });

    it("authenticated users hold only the privileges admin workflows need", async () => {
      expect(await tablePriv("authenticated", "admin_users", "SELECT")).toBe(true);
      for (const priv of ["INSERT", "UPDATE", "DELETE"]) {
        expect(await tablePriv("authenticated", "admin_users", priv), priv).toBe(false);
      }
      for (const priv of ["INSERT", "DELETE"]) {
        expect(await tablePriv("authenticated", "profiles", priv), priv).toBe(false);
        expect(await tablePriv("authenticated", "site_settings", priv), priv).toBe(false);
      }
      expect(await columnPriv("authenticated", "contact_messages", "is_read", "UPDATE")).toBe(true);
      for (const column of ["name", "email", "message", "created_at"]) {
        expect(await columnPriv("authenticated", "contact_messages", column, "UPDATE"), column).toBe(false);
      }
    });

    it("only the public functions are executable by the API roles", async () => {
      for (const role of ["anon", "authenticated"]) {
        for (const fn of PUBLIC_FUNCTIONS) expect(await canExecute(role, fn), `${role} ${fn}`).toBe(true);
        for (const fn of INTERNAL_FUNCTIONS.filter((f) => f !== "portfolio_profile_id()")) {
          expect(await canExecute(role, fn), `${role} ${fn}`).toBe(false);
        }
      }
      expect(await canExecute("anon", "portfolio_profile_id()")).toBe(false);
      expect(await canExecute("authenticated", "portfolio_profile_id()")).toBe(true);
    });
  });

  describe("legitimate public access keeps working", () => {
    it("visitors and signed-in users read published content and the masked profile", async () => {
      for (const who of ["anon", "user"] as const) {
        for (const table of PUBLIC_READ) {
          await expect(t[who](`select 1 from public.${table} limit 1`)).resolves.toBeDefined();
        }
        const profile = await t[who]<{ full_name: string; phone: string | null }>(
          "select full_name, phone from public.get_public_profile()",
        );
        expect(profile.rows[0]).toEqual({ full_name: "Praveen", phone: null });
      }
    });

    it("ordinary signed-in users cannot read private profile data directly", async () => {
      expect((await t.user("select phone, email from public.profiles")).rows).toHaveLength(0);
      expect((await t.user("select * from public.admin_users")).rows).toHaveLength(0);
    });

    it("visitors and signed-in users can submit contact messages but not read or edit them", async () => {
      await t.anon("insert into public.contact_messages (name, email, message) values ('Ana', 'a@b.co', 'Hello from anon!')");
      await t.user("insert into public.contact_messages (name, email, message) values ('Ben', 'b@b.co', 'Hello from a user!')");
      expect((await t.user("select * from public.contact_messages")).rows).toHaveLength(0);
      expect((await t.user("update public.contact_messages set is_read = true returning id")).rows).toHaveLength(0);
      expect((await t.user("delete from public.contact_messages returning id")).rows).toHaveLength(0);
      await expect(t.user("update public.contact_messages set message = 'tampered'")).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  describe("non-admin users cannot modify portfolio content", () => {
    it("is enforced on every content table, the profile and the settings", async () => {
      for (const table of CONTENT) {
        expect((await t.user(`update public.${table} set sort_order = 999 returning id`)).rows, table).toHaveLength(0);
        expect((await t.user(`delete from public.${table} returning id`)).rows, table).toHaveLength(0);
      }
      await expect(t.user("insert into public.skills (name, category) values ('X', 'Y')")).rejects.toThrow(
        /row-level security/,
      );
      expect((await t.user("update public.profiles set full_name = 'X' returning id")).rows).toHaveLength(0);
      expect((await t.user("update public.site_settings set hero_title = 'X' returning id")).rows).toHaveLength(0);
      await expect(t.user("truncate public.projects cascade")).rejects.toThrow(/permission denied/);
    });

    it("cannot grant themselves admin access in any way", async () => {
      await expect(t.user(`insert into public.admin_users (user_id) values ('${USER_ID}')`)).rejects.toThrow(
        /permission denied/,
      );
      await expect(t.user(`update public.admin_users set user_id = '${USER_ID}'`)).rejects.toThrow(/permission denied/);
      await expect(t.user("delete from public.admin_users")).rejects.toThrow(/permission denied/);
      expect((await t.user<{ ok: boolean }>("select public.is_admin() as ok")).rows[0].ok).toBe(false);
    });
  });

  describe("administrators keep full CRUD", () => {
    it("can create, update and delete rows in every content table (triggers still fire)", async () => {
      const inserts: Record<string, string> = {
        projects: "(slug, title) values ('admin-crud', 'Admin CRUD')",
        certificates: "(title, issuer) values ('Admin cert', 'Issuer')",
        achievements: "(title) values ('Admin achievement')",
        coding_profiles: "(platform) values ('Codeforces')",
        skills: "(name, category) values ('Rust', 'Programming Languages')",
        experiences: "(role, organization) values ('Role', 'Org')",
        education: "(degree, institution) values ('Degree', 'Institution')",
      };
      for (const table of CONTENT) {
        const created = await t.admin<{ id: string; profile_id: string; updated_at: string }>(
          `insert into public.${table} ${inserts[table]} returning id, profile_id, updated_at`,
        );
        const row = created.rows[0];
        expect(row.profile_id, `${table} default profile_id`).toBeTruthy();
        const updated = await t.admin<{ updated_at: string; is_published: boolean }>(
          `update public.${table} set is_published = true, updated_at = '2000-01-01' where id = $1 returning updated_at, is_published`,
          [row.id],
        );
        expect(updated.rows[0].is_published).toBe(true);
        expect(new Date(updated.rows[0].updated_at).getFullYear(), `${table} updated_at trigger`).toBeGreaterThan(2000);
        expect((await t.admin(`delete from public.${table} where id = $1 returning id`, [row.id])).rows).toHaveLength(1);
      }
    });

    it("can edit the profile, draft and published settings, and manage messages", async () => {
      expect((await t.admin("update public.profiles set location = 'Coimbatore' returning id")).rows).toHaveLength(1);
      expect((await t.admin("update public.site_settings set footer_text = 'x' returning id")).rows).toHaveLength(2);
      const messages = await t.admin<{ id: string }>("select id from public.contact_messages");
      expect(messages.rows.length).toBeGreaterThan(0);
      const id = messages.rows[0].id;
      expect((await t.admin("update public.contact_messages set is_read = true where id = $1 returning id", [id])).rows)
        .toHaveLength(1);
      expect((await t.admin("delete from public.contact_messages where id = $1 returning id", [id])).rows).toHaveLength(1);
    });

    it("cannot TRUNCATE either (destructive bulk operations are not part of the API)", async () => {
      await expect(t.admin("truncate public.skills cascade")).rejects.toThrow(/permission denied/);
    });
  });

  describe("certificate and resume files follow publication rules", () => {
    it("only published certificate files are reachable by visitors and ordinary users", async () => {
      for (const who of ["anon", "user"] as const) {
        expect(await documentsVisibleTo(who), who).toEqual([PUBLISHED_PDF]);
      }
      expect(await documentsVisibleTo("anon")).not.toContain(DRAFT_PDF);
    });

    it("unpublishing a certificate hides its file immediately", async () => {
      await t.admin("update public.certificates set is_published = false where pdf_path = $1", [PUBLISHED_PDF]);
      expect(await documentsVisibleTo("anon")).toEqual([]);
      await t.admin("update public.certificates set is_published = true where pdf_path = $1", [PUBLISHED_PDF]);
      expect(await documentsVisibleTo("anon")).toEqual([PUBLISHED_PDF]);
    });

    it("only the current resume is reachable, and only once one is set", async () => {
      const before = await t.anon<{ resume_path: string }>("select * from public.get_public_resume()");
      expect(before.rows).toHaveLength(0);

      await t.admin("update public.profiles set resume_path = $1, resume_file_name = 'cv.pdf'", [RESUME]);
      const after = await t.anon<{ resume_path: string }>("select resume_path from public.get_public_resume()");
      expect(after.rows).toEqual([{ resume_path: RESUME }]);
      const visible = await documentsVisibleTo("anon");
      expect(visible).toContain(RESUME);
      expect(visible).not.toContain(OLD_RESUME);

      await t.admin("update public.profiles set resume_path = null, resume_file_name = null");
      expect(await documentsVisibleTo("anon")).not.toContain(RESUME);
    });

    it("administrators can reach every document, including drafts", async () => {
      const names = (await t.admin<{ name: string }>("select name from storage.objects where bucket_id = 'documents'"))
        .rows.map((r) => r.name);
      expect(names).toEqual(expect.arrayContaining([DRAFT_PDF, PUBLISHED_PDF, RESUME, OLD_RESUME]));
    });
  });

  describe("contact flood protection", () => {
    it("still runs for visitors without any EXECUTE grant on the trigger function", async () => {
      await t.owner(`
        insert into public.contact_messages (name, email, message)
        select 'Seed', 's@b.co', 'Filler message ' || g from generate_series(1, 30 - (
          select count(*)::int from public.contact_messages where created_at > now() - interval '1 hour')) g;
      `);
      await expect(
        t.anon("insert into public.contact_messages (name, email, message) values ('Ana', 'a@b.co', 'One too many!')"),
      ).rejects.toThrow(/Too many messages/);
    });
  });

  it("uses the expected test identities", () => {
    expect(ADMIN_ID).not.toBe(USER_ID);
  });
});
