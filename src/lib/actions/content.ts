"use server";

import { z } from "zod";
import { collectFilePaths, isResourceKey, RESOURCES, type ResourceFlag } from "@/lib/admin/resources";
import { assertNoDbError, UserFacingError, withAdmin, type ActionResult } from "@/lib/actions/result";
import { revalidatePortfolio } from "@/lib/actions/revalidate";
import { removeStoredFiles, verifyUploadedObject } from "@/lib/uploads/server";
import { requiredText } from "@/lib/validation/schemas";

const uuid = z.uuid("Invalid id");

function resourceOf(key: unknown) {
  if (!isResourceKey(key)) throw new UserFacingError("Unknown content type.");
  return { key, config: RESOURCES[key] };
}

export async function saveResource(
  resource: string,
  id: string | null,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin(async ({ supabase }) => {
    const { key, config } = resourceOf(resource);
    if (id !== null) uuid.parse(id);
    const parsed = config.schema.parse(values) as Record<string, unknown>;

    let existing: Record<string, unknown> | null = null;
    if (id) {
      const { data, error } = await supabase.from(config.table).select("*").eq("id", id).maybeSingle();
      assertNoDbError(error, `load ${config.table}`);
      if (!data) throw new UserFacingError(`This ${config.singular} no longer exists.`);
      existing = data;
    }

    const previousFiles = collectFilePaths(key, existing);
    const nextFiles = collectFilePaths(key, parsed);
    const previousPaths = new Set(previousFiles.map((f) => f.path));
    for (const file of nextFiles) {
      if (!previousPaths.has(file.path)) await verifyUploadedObject(supabase, file.kind, file.path);
    }

    let savedId: string;
    if (id) {
      const { data, error } = await supabase
        .from(config.table)
        .update(parsed)
        .eq("id", id)
        .select("id")
        .single();
      assertNoDbError(error, `update ${config.table}`);
      savedId = data!.id;
    } else {
      const { data: last, error: orderError } = await supabase
        .from(config.table)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      assertNoDbError(orderError, `order ${config.table}`);
      const { data, error } = await supabase
        .from(config.table)
        .insert({ ...parsed, sort_order: (last?.sort_order ?? -1) + 1 })
        .select("id")
        .single();
      assertNoDbError(error, `insert ${config.table}`);
      savedId = data!.id;
    }

    const nextPaths = new Set(nextFiles.map((f) => f.path));
    await removeStoredFiles(
      supabase,
      previousFiles.filter((f) => !nextPaths.has(f.path)),
    );

    revalidatePortfolio();
    return { id: savedId };
  }, "Saved");
}

export async function deleteResource(resource: string, id: string): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const { key, config } = resourceOf(resource);
    uuid.parse(id);
    const { data, error } = await supabase.from(config.table).delete().eq("id", id).select("*");
    assertNoDbError(error, `delete ${config.table}`);
    if (!data?.length) throw new UserFacingError(`This ${config.singular} was already deleted.`);
    await removeStoredFiles(supabase, collectFilePaths(key, data[0]));
    revalidatePortfolio();
    return null;
  }, "Deleted");
}

export async function setResourceFlag(
  resource: string,
  id: string,
  flag: ResourceFlag,
  value: boolean,
): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const { config } = resourceOf(resource);
    uuid.parse(id);
    if (!(config.flags as readonly string[]).includes(flag) || typeof value !== "boolean") {
      throw new UserFacingError("This setting cannot be changed here.");
    }
    const { data, error } = await supabase
      .from(config.table)
      .update({ [flag]: value })
      .eq("id", id)
      .select("id");
    assertNoDbError(error, `flag ${config.table}`);
    if (!data?.length) throw new UserFacingError(`This ${config.singular} no longer exists.`);
    revalidatePortfolio();
    return null;
  }, "Updated");
}

export async function reorderResource(resource: string, orderedIds: string[]): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const { config } = resourceOf(resource);
    const ids = z.array(uuid).min(1).max(500).parse(orderedIds);
    if (new Set(ids).size !== ids.length) throw new UserFacingError("Duplicate ids in ordering.");
    const results = await Promise.all(
      ids.map((id, index) => supabase.from(config.table).update({ sort_order: index }).eq("id", id)),
    );
    for (const { error } of results) assertNoDbError(error, `reorder ${config.table}`);
    revalidatePortfolio();
    return null;
  }, "Order saved");
}

export async function renameSkillCategory(from: string, to: string): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const source = requiredText("Category", 60).parse(from);
    const target = requiredText("New category name", 60).parse(to);
    if (source === target) return null;
    const { error } = await supabase.from("skills").update({ category: target }).eq("category", source);
    assertNoDbError(error, "rename skill category");
    revalidatePortfolio();
    return null;
  }, "Category renamed");
}
