import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { ProfileEditor } from "@/components/admin/profile-forms";
import { requireAdminPage } from "@/lib/auth/admin";
import { getProfileRow } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await connection();
  const { supabase } = await requireAdminPage("/admin/profile");
  const profile = await getProfileRow(supabase);

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your name, biography, photo, contact details, social links and resume. Changes go live when saved."
      />
      <p className="mb-6 rounded-xl border border-line bg-paper p-4 text-sm text-muted">
        Hero text and introduction are edited in{" "}
        <Link href="/admin/settings" className="font-medium text-accent hover:underline">
          Site settings
        </Link>{" "}
        (with preview before publishing). Education and experience have their own pages.
      </p>
      {profile ? (
        <ProfileEditor profile={profile} limits={getUploadLimits()} />
      ) : (
        <p role="alert" className="rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm">
          The profile row is missing. Run <code className="font-mono">supabase/seed.sql</code> in the Supabase SQL
          editor, then reload this page.
        </p>
      )}
    </>
  );
}
