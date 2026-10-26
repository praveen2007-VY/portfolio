"use client";

import { useId, useState } from "react";
import { Controller, type Control, type FieldErrors, type FieldValues, type UseFormRegister } from "react-hook-form";
import { X } from "lucide-react";
import { FileField, GalleryField } from "@/components/admin/file-upload";
import type { UploadKind } from "@/lib/uploads/config";
import { cn } from "@/lib/utils/format";

type Base = { name: string; label: string; help?: string; span?: "full" | "half"; required?: boolean };

export type FieldDef =
  | (Base & {
      type: "text" | "url" | "email" | "date" | "number" | "slug";
      placeholder?: string;
    })
  | (Base & { type: "textarea"; rows?: number; placeholder?: string })
  | (Base & { type: "tags"; placeholder?: string })
  | (Base & { type: "list"; placeholder?: string })
  | (Base & { type: "switch" })
  | (Base & { type: "combobox"; suggestions: string[]; placeholder?: string })
  | (Base & { type: "file"; kind: UploadKind; fileNameField?: string })
  | (Base & { type: "files"; kind: UploadKind; max: number });

type FieldProps = {
  field: FieldDef;
  control: Control<FieldValues>;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  setFileName?: (name: string, value: string) => void;
};

function errorOf(errors: FieldErrors<FieldValues>, name: string): string | undefined {
  const value = name.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], errors);
  return (value as { message?: string } | undefined)?.message;
}

export function Field({ field, control, register, errors, setFileName }: FieldProps) {
  const id = useId();
  const error = errorOf(errors, field.name);
  const describedBy = [field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-invalid": Boolean(error), "aria-describedby": describedBy };

  let input: React.ReactNode;
  switch (field.type) {
    case "textarea":
      input = (
        <textarea
          {...common}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          className="field-input resize-y"
          {...register(field.name)}
        />
      );
      break;
    case "switch":
      input = (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <button
              type="button"
              role="switch"
              id={id}
              aria-checked={Boolean(f.value)}
              aria-describedby={describedBy}
              onClick={() => f.onChange(!f.value)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                f.value ? "bg-accent" : "bg-line-strong",
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 rounded-full bg-white shadow transition-transform",
                  f.value ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          )}
        />
      );
      break;
    case "tags":
      input = (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <TagInput
              id={id}
              value={(f.value as string[]) ?? []}
              onChange={f.onChange}
              placeholder={field.placeholder}
              invalid={Boolean(error)}
              describedBy={describedBy}
            />
          )}
        />
      );
      break;
    case "list":
      input = (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <textarea
              {...common}
              rows={Math.max(3, ((f.value as string[]) ?? []).length + 1)}
              placeholder={field.placeholder ?? "One item per line"}
              className="field-input resize-y"
              value={((f.value as string[]) ?? []).join("\n")}
              onChange={(e) => f.onChange(e.target.value.split("\n"))}
              onBlur={() => f.onChange(((f.value as string[]) ?? []).map((s) => s.trim()).filter(Boolean))}
            />
          )}
        />
      );
      break;
    case "combobox":
      input = (
        <>
          <input
            {...common}
            list={`${id}-options`}
            placeholder={field.placeholder}
            className="field-input"
            autoComplete="off"
            {...register(field.name)}
          />
          <datalist id={`${id}-options`}>
            {field.suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      );
      break;
    case "file":
      input = (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <FileField
              id={id}
              kind={field.kind}
              value={(f.value as string) || null}
              invalid={Boolean(error)}
              onChange={(path, fileName) => {
                f.onChange(path);
                if (field.fileNameField && fileName) setFileName?.(field.fileNameField, fileName);
              }}
            />
          )}
        />
      );
      break;
    case "files":
      input = (
        <Controller
          control={control}
          name={field.name}
          render={({ field: f }) => (
            <GalleryField
              id={id}
              kind={field.kind}
              max={field.max}
              value={(f.value as string[]) ?? []}
              onChange={f.onChange}
            />
          )}
        />
      );
      break;
    default:
      input = (
        <input
          {...common}
          type={
            field.type === "url" ? "url" : field.type === "email" ? "email" : field.type === "number" ? "number" : "text"
          }
          inputMode={field.type === "number" || field.type === "date" ? "numeric" : undefined}
          placeholder={field.placeholder ?? (field.type === "date" ? "YYYY or YYYY-MM" : undefined)}
          className={cn("field-input", (field.type === "slug" || field.type === "date") && "font-mono text-[14px]")}
          {...register(field.name)}
        />
      );
  }

  if (field.type === "switch") {
    return (
      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-xl border border-line p-4",
          field.span !== "half" && "sm:col-span-2",
        )}
      >
        <div>
          <label htmlFor={id} className="text-[14px] font-medium text-ink">
            {field.label}
          </label>
          {field.help && (
            <p id={`${id}-help`} className="mt-0.5 text-[12.5px] text-muted">
              {field.help}
            </p>
          )}
        </div>
        {input}
      </div>
    );
  }

  return (
    <div className={cn(field.span !== "half" && "sm:col-span-2")}>
      <label htmlFor={id} className="field-label">
        {field.label}
        {field.required && <span className="text-danger"> *</span>}
      </label>
      {input}
      {field.help && (
        <p id={`${id}-help`} className="field-help">
          {field.help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function TagInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  invalid: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const items = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.includes(s));
    if (items.length) onChange([...value, ...items]);
    setDraft("");
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-xl border bg-paper px-2.5 py-2 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15",
        invalid ? "border-danger" : "border-line-strong",
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-mist py-0.5 pr-1 pl-2 text-[13px] text-ink-2"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="rounded p-0.5 text-subtle hover:bg-line hover:text-ink"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        aria-describedby={describedBy}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : (placeholder ?? "Type and press Enter")}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-[15px] outline-none placeholder:text-subtle"
      />
    </div>
  );
}
