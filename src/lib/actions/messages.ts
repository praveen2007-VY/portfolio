"use server";

import { z } from "zod";
import { assertNoDbError, withAdmin, type ActionResult } from "@/lib/actions/result";
import { refreshAdmin } from "@/lib/actions/revalidate";

const uuid = z.uuid();

export async function setMessageRead(id: string, isRead: boolean): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ is_read: z.boolean().parse(isRead) })
      .eq("id", uuid.parse(id));
    assertNoDbError(error, "update message");
    refreshAdmin();
    return null;
  });
}

export async function deleteMessage(id: string): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("contact_messages").delete().eq("id", uuid.parse(id));
    assertNoDbError(error, "delete message");
    refreshAdmin();
    return null;
  }, "Message deleted");
}
