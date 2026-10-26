"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFeedback } from "@/components/admin/feedback";
import { Field } from "@/components/admin/fields";
import { rowToForm, slugify, type ResourceUI, type Row } from "@/components/admin/resource-configs";
import { useUploadSession } from "@/components/admin/upload-session";
import { Button } from "@/components/ui/button";
import { saveResource } from "@/lib/actions/content";

type ResourceFormProps = {
  ui: ResourceUI;
  row: Row | null;
  rows: Row[];
  onDone: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

export function ResourceForm({ ui, row, rows, onDone, onDirtyChange }: ResourceFormProps) {
  const fields = ui.fields(rows);
  const { toast } = useFeedback();
  const session = useUploadSession();
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const isNew = row === null;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, isDirty },
  } = useForm<FieldValues>({
    defaultValues: rowToForm(fields, row),
    resolver: zodResolver(ui.schema as never, undefined, { raw: true }) as Resolver<FieldValues>,
  });

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  // New items: derive the slug from the title until the slug is edited by hand.
  const title = useWatch({ control, name: "title" });
  const hasSlug = fields.some((f) => f.name === "slug");
  useEffect(() => {
    if (!isNew || !hasSlug || typeof title !== "string") return;
    if (getFieldState("slug").isDirty) return;
    setValue("slug", slugify(title), { shouldValidate: false });
  }, [title, isNew, hasSlug, setValue, getFieldState]);

  async function save(values: FieldValues, publish: boolean) {
    setSaving(publish ? "publish" : "draft");
    const result = await saveResource(ui.key, row?.id ?? null, { ...values, is_published: publish });
    setSaving(null);
    if (result.ok) {
      session.commit();
      toast("success", publish ? `${capitalize(ui.singular)} saved and published.` : `${capitalize(ui.singular)} saved as ${ui.visibilityLabels ? "hidden" : "draft"}.`);
      onDone();
      return;
    }
    for (const [name, message] of Object.entries(result.fieldErrors ?? {})) setError(name, { message });
    toast("error", result.error);
  }

  const published = row?.is_published ?? false;
  const labels = ui.visibilityLabels;
  const secondaryLabel = labels
    ? published
      ? "Save & hide"
      : "Save hidden"
    : published
      ? "Save & unpublish"
      : "Save draft";
  const primaryLabel = labels ? (published ? "Save" : "Save & show") : published ? "Save changes" : "Publish";

  return (
    <form
      noValidate
      // Enter key: keep the current visibility (new items start as drafts).
      onSubmit={handleSubmit((v) => save(v, published))}
      className="flex h-full flex-col"
    >
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              control={control}
              register={register}
              errors={errors}
              setFileName={(name, value) => setValue(name, value)}
            />
          ))}
        </div>
        {errors._form?.message && <p className="field-error mt-4">{String(errors._form.message)}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-mist/60 px-5 py-4 sm:px-7">
        <Button
          type="button"
          variant="secondary"
          loading={saving === "draft"}
          disabled={saving !== null}
          onClick={handleSubmit((v) => save(v, false))}
        >
          {secondaryLabel}
        </Button>
        <Button
          type="button"
          loading={saving === "publish"}
          disabled={saving !== null}
          onClick={handleSubmit((v) => save(v, true))}
        >
          {primaryLabel}
        </Button>
      </div>
    </form>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
