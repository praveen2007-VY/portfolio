import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));

const auth = { user: null as null | { id: string; email: string }, isAdmin: false };
const from = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: auth.user }, error: auth.user ? null : new Error("no session") }) },
    rpc: async (fn: string) => ({ data: fn === "is_admin" ? auth.isAdmin : null, error: null }),
    from,
  }),
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  auth.user = null;
  auth.isAdmin = false;
  from.mockReset();
});

describe("getAdminSession", () => {
  it("reports unauthenticated visitors", async () => {
    const { getAdminSession } = await import("@/lib/auth/admin");
    expect((await getAdminSession()).status).toBe("unauthenticated");
  });

  it("rejects signed-in users who are not on the allowlist", async () => {
    auth.user = { id: "u1", email: "someone@example.com" };
    const { getAdminSession } = await import("@/lib/auth/admin");
    expect((await getAdminSession()).status).toBe("forbidden");
  });

  it("accepts allowlisted administrators", async () => {
    auth.user = { id: "u1", email: "owner@example.com" };
    auth.isAdmin = true;
    const { getAdminSession } = await import("@/lib/auth/admin");
    expect((await getAdminSession()).status).toBe("ok");
  });

  it("is unconfigured without Supabase env vars", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { getAdminSession } = await import("@/lib/auth/admin");
    expect((await getAdminSession()).status).toBe("unconfigured");
  });
});

describe("requireAdminPage", () => {
  it("redirects visitors to the login page", async () => {
    const { requireAdminPage } = await import("@/lib/auth/admin");
    await expect(requireAdminPage("/admin/projects")).rejects.toThrow(
      "REDIRECT:/admin/login?next=%2Fadmin%2Fprojects",
    );
  });

  it("redirects non-admins with a forbidden error", async () => {
    auth.user = { id: "u1", email: "someone@example.com" };
    const { requireAdminPage } = await import("@/lib/auth/admin");
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login?error=forbidden");
  });
});

describe("admin Server Actions", () => {
  it("refuse to write for unauthenticated and non-admin users without touching the database", async () => {
    const { saveResource, deleteResource } = await import("@/lib/actions/content");
    const anonymous = await saveResource("projects", null, { slug: "x", title: "X" });
    expect(anonymous).toMatchObject({ ok: false });

    auth.user = { id: "u1", email: "someone@example.com" };
    const nonAdmin = await deleteResource("projects", "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b");
    expect(nonAdmin).toMatchObject({ ok: false, error: expect.stringMatching(/administrator/) });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects unknown resource keys even for admins", async () => {
    auth.user = { id: "u1", email: "owner@example.com" };
    auth.isAdmin = true;
    const { saveResource } = await import("@/lib/actions/content");
    const result = await saveResource("admin_users", null, { user_id: "u1" });
    expect(result).toEqual({ ok: false, error: "Unknown content type." });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("safeAdminRedirect", () => {
  it("only allows admin paths", async () => {
    const { safeAdminRedirect } = await import("@/lib/auth/admin");
    expect(safeAdminRedirect("/admin/projects")).toBe("/admin/projects");
    expect(safeAdminRedirect("https://evil.example")).toBe("/admin");
    expect(safeAdminRedirect("//evil.example")).toBe("/admin");
    expect(safeAdminRedirect("/admin/login")).toBe("/admin");
    expect(safeAdminRedirect(undefined)).toBe("/admin");
  });
});
