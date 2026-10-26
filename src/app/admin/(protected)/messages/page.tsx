import { connection } from "next/server";
import { MessagesList } from "@/components/admin/messages-list";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth/admin";
import { getMessages } from "@/lib/data/admin";

export const instant = false;
export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await connection();
  const { supabase } = await requireAdminPage("/admin/messages");
  const messages = await getMessages(supabase);
  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages from the contact form are stored in your database. Email notifications are not sent automatically (see README)."
      />
      <MessagesList messages={messages} />
    </>
  );
}
