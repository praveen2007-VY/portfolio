import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

export const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";

export type Role = "anon" | "authenticated" | "postgres";

export type DatabaseOptions = {
  /**
   * true  : Supabase's usual behaviour — API roles get ALL on new tables and
   *         EXECUTE on new functions in public (via default privileges).
   * false : a project that does not auto-grant anything.
   * The migration must behave identically in both.
   */
  defaultGrants?: boolean;
};

export const GRANT_MODES = [
  { name: "with Supabase default grants", defaultGrants: true },
  { name: "without default grants", defaultGrants: false },
] as const;

export async function createTestDatabase({ defaultGrants = true }: DatabaseOptions = {}) {
  const db = new PGlite();
  const shim = read("tests/db/supabase-shim.sql");
  await db.exec(defaultGrants ? shim : shim.replace(/^alter default privileges.*$/gm, ""));
  for (const file of readdirSync(path.join(root, "supabase/migrations")).sort()) {
    await db.exec(read(`supabase/migrations/${file}`));
  }
  await db.exec(read("supabase/seed.sql"));
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN_ID}', 'owner@example.com'),
      ('${USER_ID}', 'someone@example.com');
    insert into public.admin_users (user_id) values ('${ADMIN_ID}');
  `);

  /** Run a statement as an API role, the way PostgREST would. */
  async function as<T = Record<string, unknown>>(
    role: Role,
    userId: string | null,
    sql: string,
    params: unknown[] = [],
  ) {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
    if (role !== "postgres") await db.exec(`set role ${role}`);
    try {
      if (params.length) return await db.query<T>(sql, params);
      const results = await db.exec(sql);
      return results[results.length - 1] as unknown as { rows: T[] };
    } finally {
      await db.exec("reset role");
    }
  }

  return {
    db,
    as,
    anon: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => as<T>("anon", null, sql, params),
    user: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", USER_ID, sql, params),
    admin: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
      as<T>("authenticated", ADMIN_ID, sql, params),
    owner: <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
      as<T>("postgres", null, sql, params),
    rerunSeed: () => db.exec(read("supabase/seed.sql")),
  };
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;
