"use client";

import { useState, useTransition } from "react";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, FileText, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/admin/feedback";
import { Field, type FieldDef } from "@/components/admin/fields";
import { FileField } from "@/components/admin/file-upload";
import { rowToForm, type Row } from "@/components/admin/resource-configs";
import { UploadSessionProvider, useUploadSession } from "@/components/admin/upload-session";
import { Button } from "@/components/ui/button";
import { removeResume, setResume, updateProfile, updateSocialLinks } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/result";
import type { UploadLimits } from "@/lib/uploads/config";
import { formatDateTime } from "@/lib/utils/format";
import { profileSchema } from "@/lib/validation/schemas";
import type { ProfileRow } from "@/types/portfolio";

const SOCIAL_FIELDS: FieldDef[] = [
  { name: "github_url", label: "GitHub", type: "url", span: "half", placeholder: "https://github.com/…" },
  { name: "linkedin_url", label: "LinkedIn", type: "url", span: "half", placeholder: "https://www.linkedin.com/in/…" },
  { name: "leetcode_url", label: "LeetCode", type: "url", span: "half", placeholder: "https://leetcode.com/u/…" },
  { name: "codechef_url", label: "CodeChef", type: "url", span: "half", placeholder: "https://www.codechef.com/users/…" },
  { name: "website_url", label: "Website", type: "url" },
];

const PROFILE_SECTIONS: { title: string; description?: string; fields: FieldDef[] }[] = [
  {
    title: "Identity",
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true, span: "half" },
      { name: "location", label: "Location", type: "text", span: "half" },
      { name: "headline", label: "Professional headline", type: "text", help: "Separate roles with “|”." },
      { name: "avatar_path", label: "Profile photo", type: "file", kind: "avatar" },
    ],
  },
  {
    title: "Biography",
    fields: [
      { name: "about", label: "About me", type: "textarea", rows: 8, help: "Separate paragraphs with a blank line." },
      { name: "focus_areas", label: "Focus areas", type: "list", help: "One per line. Shown as a list in the About section." },
    ],
  },
  {
    title: "Contact details",
    description: "Private details are only shown publicly when you switch them on.",
    fields: [
      { name: "email", label: "Email", type: "email", span: "half" },
      { name: "phone", label: "Phone", type: "text", span: "half" },
      { name: "show_email", label: "Show email publicly", type: "switch", span: "half" },
      { name: "show_phone", label: "Show phone publicly", type: "switch", span: "half" },
    ],
  },
  { title: "Social links", fields: SOCIAL_FIELDS },
];

function useSaveForm(
  fields: FieldDef[],
  initial: Row | null,
  action: (values: unknown) => Promise<ActionResult<null>>,
  onSuccess?: () => void,
) {
  const { toast } = useFeedback();
  const form = useForm<FieldValues>({
    defaultValues: rowToForm(fields, initial),
    resolver: zodResolver(profileSchema.partial() as never, undefined, { raw: true }) as Resolver<FieldValues>,
  });

  const submit = form.handleSubmit(async (values) => {
    const result = await action(values);
    if (result.ok) {
      toast("success", result.message ?? "Saved.");
      form.reset(values);
      onSuccess?.();
      return;
    }
    for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name, { message });
    toast("error", result.error);
  });

  return { form, submit };
}

export function ProfileEditor({ profile, limits }: { profile: ProfileRow; limits: UploadLimits }) {
  return (
    <>
      <UploadSessionProvider limits={limits}>
        <ProfileForm profile={profile} />
      </UploadSessionProvider>
      <UploadSessionProvider limits={limits}>
        <ResumeCard profile={profile} />
      </UploadSessionProvider>
    </>
  );
}

function ProfileForm({ profile }: { profile: ProfileRow }) {
  const allFields = PROFILE_SECTIONS.flatMap((s) => s.fields);
  const session = useUploadSession();
  const { form, submit } = useSaveForm(allFields, profile as unknown as Row, updateProfile, session.commit);
  const {
    control,
    register,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  return (
    <form
      noValidate
      onSubmit={submit}
      className="space-y-6"
    >
      {PROFILE_SECTIONS.map((section) => (
        <fieldset key={section.title} className="card p-6 sm:p-7">
          <legend className="sr-only">{section.title}</legend>
          <h2 className="text-base font-semibold text-ink">{section.title}</h2>
          {section.description && <p className="mt-1 text-sm text-muted">{section.description}</p>}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {section.fields.map((field) => (
              <Field key={field.name} field={field} control={control} register={register} errors={errors} />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-line bg-paper/90 p-3 shadow-lift backdrop-blur">
        <p className="mr-auto pl-2 text-[13px] text-muted">{isDirty ? "You have unsaved changes." : "All changes saved."}</p>
        <Button type="submit" loading={isSubmitting}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function ResumeCard({ profile }: { profile: ProfileRow }) {
  const { toast, confirm } = useFeedback();
  const session = useUploadSession();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function publish() {
    if (!pendingPath) return;
    startTransition(async () => {
      const result = await setResume({ resume_path: pendingPath, resume_file_name: pendingName });
      if (result.ok) {
        session.commit();
        setPendingPath(null);
        setPendingName(null);
        toast("success", "Resume published. The Download Resume button now serves this file.");
      } else {
        toast("error", result.error);
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: "Remove the published resume?",
      description: "The Download Resume buttons will disappear from your portfolio.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removeResume();
      toast(result.ok ? "success" : "error", result.ok ? "Resume removed." : result.error);
    });
  }

  return (
    <section id="resume" aria-labelledby="resume-title" className="card mt-6 scroll-mt-24 p-6 sm:p-7">
      <h2 id="resume-title" className="text-base font-semibold text-ink">
        Resume
      </h2>
      <p className="mt-1 text-sm text-muted">
        Upload a PDF to publish it. Visitors always download the current file from <code className="font-mono">/resume</code>.
      </p>

      {profile.resume_path ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-mist/50 p-4">
          <FileText className="size-5 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{profile.resume_file_name ?? "Resume.pdf"}</p>
            {profile.resume_updated_at && (
              <p className="text-[12.5px] text-muted">Published {formatDateTime(profile.resume_updated_at)}</p>
            )}
          </div>
          <a href="/resume" target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-paper">
            <Download className="size-3.5" aria-hidden /> Download
          </a>
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </Button>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-line-strong p-4 text-sm text-muted">
          No resume is published. The Download Resume buttons are hidden until you upload one.
        </p>
      )}

      <div className="mt-5">
        <p className="field-label">{profile.resume_path ? "Replace with a new PDF" : "Upload resume PDF"}</p>
        <FileField
          kind="resume"
          value={pendingPath}
          onChange={(path, name) => {
            setPendingPath(path);
            setPendingName(name ?? null);
          }}
        />
        {pendingPath && (
          <div className="mt-3 flex justify-end">
            <Button onClick={publish} loading={busy}>
              Publish this resume
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export function SocialLinksForm({ profile }: { profile: ProfileRow }) {
  const { form, submit } = useSaveForm(SOCIAL_FIELDS, profile as unknown as Row, updateSocialLinks);
  const {
    control,
    register,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <form noValidate onSubmit={submit} className="card p-6 sm:p-7">
      <h2 className="text-base font-semibold text-ink">Social links</h2>
      <p className="mt-1 text-sm text-muted">
        Shown in the hero, contact section and footer. Changes go live when saved.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((field) => (
          <Field key={field.name} field={field} control={control} register={register} errors={errors} />
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" variant="secondary" loading={isSubmitting}>
          Save links
        </Button>
      </div>
    </form>
  );
}
