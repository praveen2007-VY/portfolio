import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateSeedSql } from "../../scripts/generate-seed";

describe("supabase/seed.sql", () => {
  it("is up to date with src/lib/content/resume.ts (run `npm run seed:generate`)", () => {
    const onDisk = readFileSync(path.resolve(__dirname, "../../supabase/seed.sql"), "utf8").replace(/\r\n/g, "\n");
    expect(onDisk).toBe(generateSeedSql());
  });
});
