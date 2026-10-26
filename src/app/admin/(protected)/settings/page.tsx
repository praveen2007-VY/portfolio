import { connection } from "next/server";
import { PageHeader } from "@/components/admin/page-header";
import { SocialLinksForm } from "@/components/admin/profile-forms";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { getProfileRow, getSettingsRows } from "@/lib/data/admin";
import { normalizeSettings } from "@/lib/data/normalize";

export const instant = false;
export const metadata = { title: "Site settings" };

const COMPARED = [
  "hero_eyebrow",
  "hero_greeting",
  "hero_title",
  "hero_highlight",
  "hero_intro",
  "sections",
  "accent",
  "animation_level",
  "enable_3d",
  "coding_summary",
  "footer_text",
  "seo_title",
  "seo_description",
] as const;

export default async function SettingsPage() {
  await connection();
  const { supabase } = await requireAdminPage("/admin/settings");
  const [{ draft, published }, profile] = await Promise.all([getSettingsRows(supabase), getProfileRow(supabase)]);

  if (!draft) {
    return (
      <>
        <PageHeader title="Site settings" />
        <p role="alert" className="rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm">
          The settings rows are missing. Run <code className="font-mono">supabase/seed.sql</code>, then reload.
        </p>
      </>
    );
  }

  const normalizedDraft = normalizeSettings(draft);
  const normalizedPublished = published ? normalizeSettings(published) : null;
  const pick = (s: typeof normalizedDraft) => JSON.stringify(COMPARED.map((k) => s[k]));
  const hasUnpublishedChanges = !normalizedPublished || pick(normalizedDraft) !== pick(normalizedPublished);

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Hero text, section headings, visibility, colors and motion. Edits are saved as a draft — preview them, then publish."
      />
      <SettingsForm
        key={draft.updated_at}
        draft={normalizedDraft}
        hasUnpublishedChanges={hasUnpublishedChanges}
        publishedAt={published?.published_at ?? null}
      />
      {profile && (
        <div className="mt-10">
          <SocialLinksForm profile={profile} />
        </div>
      )}
    </>
  );
}
