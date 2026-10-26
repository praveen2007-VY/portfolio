"use client";

import { useState } from "react";
import { Controller, useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ScanEye, Send, Undo2 } from "lucide-react";
import { useFeedback } from "@/components/admin/feedback";
import { Field, type FieldDef } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { discardSettingsDraft, publishSettings, saveSettingsDraft } from "@/lib/actions/settings";
import { ACCENT_HEX, ACCENT_LABELS } from "@/lib/theme";
import { cn, formatDateTime } from "@/lib/utils/format";
import { settingsSchema } from "@/lib/validation/schemas";
import { ACCENTS, SECTION_KEYS, type SectionsConfig, type SiteSettingsRow } from "@/types/portfolio";

const SECTION_LABELS: Record<(typeof SECTION_KEYS)[number], string> = {
  about: "About",
  experience: "Experience & education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certificates",
  achievements: "Achievements",
  coding: "Coding statistics",
  contact: "Contact",
};

const HERO_FIELDS: FieldDef[] = [
  { name: "hero_eyebrow", label: "Eyebrow badge", type: "text", help: "Small label above the greeting." },
  { name: "hero_greeting", label: "Greeting", type: "text", span: "half" },
  { name: "hero_highlight", label: "Highlighted words", type: "text", span: "half", help: "Must appear exactly in the title." },
  { name: "hero_title", label: "Headline", type: "text", required: true },
  { name: "hero_intro", label: "Introduction", type: "textarea", rows: 3 },
];

const OTHER_FIELDS: FieldDef[] = [
  { name: "coding_summary", label: "Coding statistics summary", type: "text" },
  { name: "footer_text", label: "Footer text", type: "text" },
  { name: "seo_title", label: "SEO title", type: "text", help: "Browser tab and search result title." },
  { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
];

type SettingsFormProps = {
  draft: SiteSettingsRow & { sections: SectionsConfig };
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
};

function toForm(draft: SettingsFormProps["draft"]): FieldValues {
  return {
    hero_eyebrow: draft.hero_eyebrow ?? "",
    hero_greeting: draft.hero_greeting ?? "",
    hero_title: draft.hero_title ?? "",
    hero_highlight: draft.hero_highlight ?? "",
    hero_intro: draft.hero_intro ?? "",
    sections: draft.sections,
    accent: draft.accent,
    animation_level: draft.animation_level,
    enable_3d: draft.enable_3d,
    coding_summary: draft.coding_summary ?? "",
    footer_text: draft.footer_text ?? "",
    seo_title: draft.seo_title ?? "",
    seo_description: draft.seo_description ?? "",
  };
}

export function SettingsForm({ draft, hasUnpublishedChanges, publishedAt }: SettingsFormProps) {
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState<null | "save" | "publish" | "preview" | "discard">(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FieldValues>({
    defaultValues: toForm(draft),
    resolver: zodResolver(settingsSchema as never, undefined, { raw: true }) as Resolver<FieldValues>,
  });

  async function saveDraft(values: FieldValues) {
    const result = await saveSettingsDraft(values);
    if (!result.ok) {
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) setError(name, { message });
      toast("error", result.error);
      return false;
    }
    reset(values);
    return true;
  }

  const onSave = handleSubmit(async (values) => {
    setBusy("save");
    if (await saveDraft(values)) toast("success", "Draft saved. Publish when you're ready.");
    setBusy(null);
  });

  const onPublish = handleSubmit(async (values) => {
    setBusy("publish");
    if (await saveDraft(values)) {
      const result = await publishSettings();
      toast(result.ok ? "success" : "error", result.ok ? "Settings published to the live site." : result.error);
    }
    setBusy(null);
  });

  const onPreview = () => {
    // Open synchronously so the browser doesn't treat it as a popup.
    const win = window.open("about:blank", "_blank");
    void handleSubmit(
      async (values) => {
        setBusy("preview");
        const ok = await saveDraft(values);
        setBusy(null);
        if (ok && win) win.location.href = "/preview";
        else win?.close();
      },
      () => win?.close(),
    )();
  };

  async function onDiscard() {
    const ok = await confirm({
      title: "Discard draft changes?",
      description: "The draft will be reset to the currently published settings.",
      confirmLabel: "Discard draft",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("discard");
    const result = await discardSettingsDraft();
    setBusy(null);
    toast(result.ok ? "success" : "error", result.ok ? "Draft reset to the published settings." : result.error);
  }

  return (
    <form noValidate onSubmit={onSave} className="space-y-6">
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm",
          hasUnpublishedChanges || isDirty ? "border-warning/30 bg-warning/5" : "border-success/25 bg-success/5",
        )}
      >
        <span className={cn("size-2 rounded-full", hasUnpublishedChanges || isDirty ? "bg-warning" : "bg-success")} />
        <p className="flex-1 text-ink-2">
          {isDirty
            ? "You have unsaved edits."
            : hasUnpublishedChanges
              ? "The draft has changes that are not published yet."
              : "The live site matches this draft."}
          {publishedAt && <span className="text-muted"> Last published {formatDateTime(publishedAt)}.</span>}
        </p>
        {hasUnpublishedChanges && !isDirty && (
          <Button type="button" variant="ghost" size="sm" onClick={onDiscard} loading={busy === "discard"}>
            <Undo2 className="size-3.5" aria-hidden /> Discard draft
          </Button>
        )}
      </div>

      <fieldset className="card p-6 sm:p-7">
        <legend className="sr-only">Hero</legend>
        <h2 className="text-base font-semibold text-ink">Hero</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {HERO_FIELDS.map((f) => (
            <Field key={f.name} field={f} control={control} register={register} errors={errors} />
          ))}
        </div>
      </fieldset>

      <fieldset className="card p-6 sm:p-7">
        <legend className="sr-only">Sections</legend>
        <h2 className="text-base font-semibold text-ink">Sections</h2>
        <p className="mt-1 text-sm text-muted">Headings, descriptions and visibility of each section.</p>
        <div className="mt-5 space-y-3">
          {SECTION_KEYS.map((key) => (
            <details key={key} className="group rounded-xl border border-line open:bg-mist/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="font-medium text-ink">{SECTION_LABELS[key]}</span>
                <Controller
                  control={control}
                  name={`sections.${key}.visible`}
                  render={({ field }) => (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        field.value ? "bg-success/10 text-success" : "bg-line text-muted",
                      )}
                    >
                      {field.value ? "Visible" : "Hidden"}
                    </span>
                  )}
                />
              </summary>
              <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
                <Field
                  field={{ name: `sections.${key}.visible`, label: "Show this section", type: "switch" }}
                  control={control}
                  register={register}
                  errors={errors}
                />
                <Field
                  field={{ name: `sections.${key}.eyebrow`, label: "Eyebrow", type: "text", span: "half" }}
                  control={control}
                  register={register}
                  errors={errors}
                />
                <Field
                  field={{ name: `sections.${key}.title`, label: "Heading", type: "text", span: "half" }}
                  control={control}
                  register={register}
                  errors={errors}
                />
                <Field
                  field={{ name: `sections.${key}.description`, label: "Description", type: "textarea", rows: 2 }}
                  control={control}
                  register={register}
                  errors={errors}
                />
              </div>
            </details>
          ))}
        </div>
      </fieldset>

      <fieldset className="card p-6 sm:p-7">
        <legend className="sr-only">Appearance</legend>
        <h2 className="text-base font-semibold text-ink">Appearance & motion</h2>
        <p className="mt-2 text-[13px] font-medium text-ink-2" id="accent-label">
          Accent color
        </p>
        <Controller
          control={control}
          name="accent"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="accent-label" className="mt-3 flex flex-wrap gap-2">
              {ACCENTS.map((accent) => {
                const selected = field.value === accent;
                return (
                  <button
                    key={accent}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(accent)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                      selected ? "border-ink bg-paper text-ink" : "border-line text-ink-2 hover:border-line-strong",
                    )}
                  >
                    <span className="grid size-5 place-items-center rounded-full" style={{ background: ACCENT_HEX[accent] }}>
                      {selected && <Check className="size-3 text-white" aria-hidden />}
                    </span>
                    {ACCENT_LABELS[accent]}
                  </button>
                );
              })}
            </div>
          )}
        />
        <p className="mt-6 text-[13px] font-medium text-ink-2" id="motion-label">
          Animation level
        </p>
        <Controller
          control={control}
          name="animation_level"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="motion-label" className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { value: "full", label: "Full", help: "Parallax, reveals and 3D motion (still respects visitors' reduced-motion setting)." },
                { value: "reduced", label: "Reduced", help: "Minimal movement for everyone." },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === option.value}
                  onClick={() => field.onChange(option.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    field.value === option.value ? "border-ink bg-paper" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="block text-sm font-medium text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">{option.help}</span>
                </button>
              ))}
            </div>
          )}
        />
        <div className="mt-5 grid">
          <Field
            field={{
              name: "enable_3d",
              label: "Interactive 3D hero",
              type: "switch",
              help: "When off, a lightweight static illustration is shown instead.",
            }}
            control={control}
            register={register}
            errors={errors}
          />
        </div>
      </fieldset>

      <fieldset className="card p-6 sm:p-7">
        <legend className="sr-only">Content and SEO</legend>
        <h2 className="text-base font-semibold text-ink">Footer, statistics & SEO</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {OTHER_FIELDS.map((f) => (
            <Field key={f.name} field={f} control={control} register={register} errors={errors} />
          ))}
        </div>
      </fieldset>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-line bg-paper/90 p-3 shadow-lift backdrop-blur">
        <Button type="submit" variant="secondary" loading={busy === "save"} disabled={busy !== null}>
          Save draft
        </Button>
        <Button type="button" variant="secondary" onClick={onPreview} loading={busy === "preview"} disabled={busy !== null}>
          <ScanEye className="size-4" aria-hidden /> Preview
        </Button>
        <Button type="button" onClick={onPublish} loading={busy === "publish"} disabled={busy !== null}>
          <Send className="size-4" aria-hidden /> Publish
        </Button>
      </div>
    </form>
  );
}
