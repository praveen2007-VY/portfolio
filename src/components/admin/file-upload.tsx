"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eye, FileText, ImageIcon, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useUploadSession } from "@/components/admin/upload-session";
import { Button } from "@/components/ui/button";
import { getFilePreviewUrl, requestUpload } from "@/lib/actions/uploads";
import { getSupabaseConfig } from "@/lib/env";
import { mediaUrl } from "@/lib/supabase/storage";
import {
  formatBytes,
  MIME_EXTENSIONS,
  UPLOAD_KINDS,
  validateUpload,
  type UploadKind,
} from "@/lib/uploads/config";
import { cn } from "@/lib/utils/format";

function putWithProgress(url: string, file: File, onProgress: (ratio: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("x-upsert", "false");
    const key = getSupabaseConfig()?.key;
    if (key) xhr.setRequestHeader("apikey", key);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Upload failed (${xhr.status}).`;
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        // keep the generic message
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}

type Uploaded = { path: string; name: string };

/** Uploads one file to Supabase Storage. Used by FileField and GalleryField. */
export function useUploader(kind: UploadKind) {
  const session = useUploadSession();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<Uploaded | null> {
    setError(null);
    const problem = validateUpload(kind, file, session.limits);
    if (problem) {
      setError(problem);
      return null;
    }
    setProgress(0);
    try {
      const ticket = await requestUpload(kind, { type: file.type, size: file.size });
      if (!ticket.ok) throw new Error(ticket.error);
      await putWithProgress(ticket.data.signedUrl, file, setProgress);
      session.track(kind, ticket.data.path);
      return { path: ticket.data.path, name: file.name };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      return null;
    } finally {
      setProgress(null);
    }
  }

  return { upload, progress, error, setError, session };
}

function acceptFor(kind: UploadKind) {
  return UPLOAD_KINDS[kind].types.join(",");
}

function describeLimits(kind: UploadKind, limit: number) {
  const exts = [...new Set(UPLOAD_KINDS[kind].types.map((t) => MIME_EXTENSIONS[t].toUpperCase()))];
  return `${exts.join(", ")} · up to ${formatBytes(limit)}`;
}

type FileFieldProps = {
  id?: string;
  kind: UploadKind;
  value: string | null;
  onChange: (path: string | null, fileName?: string) => void;
  invalid?: boolean;
};

export function FileField({ id, kind, value, onChange, invalid }: FileFieldProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const { upload, progress, error, setError, session } = useUploader(kind);
  const [dragging, setDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const config = UPLOAD_KINDS[kind];
  const isImage = config.types.every((t) => t.startsWith("image/"));
  const limit = session.limits[config.size];

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const previous = value;
    const preview = isImage ? URL.createObjectURL(file) : null;
    const result = await upload(file);
    if (!result) {
      if (preview) URL.revokeObjectURL(preview);
      return;
    }
    setLocalPreview(preview);
    if (previous && session.isPending(previous)) session.discard(previous);
    onChange(result.path, result.name);
  }

  function remove() {
    if (value && session.isPending(value)) session.discard(value);
    setLocalPreview(null);
    onChange(null);
  }

  async function view() {
    if (!value) return;
    setOpening(true);
    const res = await getFilePreviewUrl(kind, value);
    setOpening(false);
    if (res.ok) window.open(res.data, "_blank", "noopener,noreferrer");
    else setError(res.error);
  }

  const imageSrc = localPreview ?? (isImage && config.bucket === "media" ? mediaUrl(value) : null);
  const uploading = progress !== null;

  return (
    <div id={id}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex items-center gap-4 rounded-xl border border-dashed p-3 transition-colors",
          dragging ? "border-accent bg-accent-soft" : invalid ? "border-danger" : "border-line-strong bg-mist/50",
        )}
      >
        <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-paper">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URLs and admin previews
            <img src={imageSrc} alt="" className="size-full object-cover" />
          ) : value ? (
            <FileText className="size-6 text-accent" aria-hidden />
          ) : isImage ? (
            <ImageIcon className="size-6 text-subtle" aria-hidden />
          ) : (
            <UploadCloud className="size-6 text-subtle" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {uploading ? (
            <div>
              <p className="text-[13px] font-medium text-ink">Uploading… {Math.round((progress ?? 0) * 100)}%</p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((progress ?? 0) * 100)}
                aria-label={`Uploading ${config.label}`}
              >
                <div className="h-full bg-accent transition-[width]" style={{ width: `${(progress ?? 0) * 100}%` }} />
              </div>
            </div>
          ) : (
            <>
              <p className="truncate text-[13px] font-medium text-ink">
                {value ? (session.isPending(value) ? "New file ready — save to apply" : "File attached") : "Drop a file here or choose one"}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">{describeLimits(kind, limit)}</p>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={acceptFor(kind)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
            {value ? <RefreshCw className="size-3.5" aria-hidden /> : <UploadCloud className="size-3.5" aria-hidden />}
            {value ? "Replace" : "Upload"}
            <span className="sr-only"> {config.label}</span>
          </Button>
          {value && !uploading && (
            <>
              {(!isImage || config.bucket === "documents") && (
                <Button type="button" variant="ghost" size="sm" onClick={view} loading={opening}>
                  <Eye className="size-3.5" aria-hidden /> View
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={remove} aria-label={`Remove ${config.label}`}>
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

type GalleryFieldProps = {
  id?: string;
  kind: UploadKind;
  value: string[];
  max: number;
  onChange: (paths: string[]) => void;
};

/** Multiple images (project screenshots) with add, remove and reorder. */
export function GalleryField({ id, kind, value, max, onChange }: GalleryFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, progress, error, setError, session } = useUploader(kind);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    let next = [...value];
    for (const file of Array.from(files)) {
      if (next.length >= max) {
        setError(`At most ${max} images.`);
        break;
      }
      const result = await upload(file);
      if (!result) break;
      setPreviews((p) => ({ ...p, [result.path]: URL.createObjectURL(file) }));
      next = [...next, result.path];
      onChange(next);
    }
  }

  function remove(path: string) {
    if (session.isPending(path)) session.discard(path);
    onChange(value.filter((p) => p !== path));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div id={id}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((path, index) => (
          <li key={path} className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-line bg-mist">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
            <img src={previews[path] ?? mediaUrl(path) ?? ""} alt={`Screenshot ${index + 1}`} className="size-full object-cover" />
            <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <span className="flex gap-1">
                <button type="button" className="rounded bg-white/90 px-1.5 text-xs" onClick={() => move(index, -1)} aria-label={`Move screenshot ${index + 1} earlier`}>
                  ←
                </button>
                <button type="button" className="rounded bg-white/90 px-1.5 text-xs" onClick={() => move(index, 1)} aria-label={`Move screenshot ${index + 1} later`}>
                  →
                </button>
              </span>
              <button type="button" className="rounded bg-white/90 p-1 text-danger" onClick={() => remove(path)} aria-label={`Remove screenshot ${index + 1}`}>
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {value.length < max && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={progress !== null}
              className="grid aspect-[16/10] w-full place-items-center rounded-lg border border-dashed border-line-strong bg-mist/50 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {progress !== null ? (
                `Uploading… ${Math.round(progress * 100)}%`
              ) : (
                <span className="flex flex-col items-center gap-1">
                  <UploadCloud className="size-5" aria-hidden /> Add screenshots
                </span>
              )}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        multiple
        accept={acceptFor(kind)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="field-help">
        {describeLimits(kind, session.limits[UPLOAD_KINDS[kind].size])} · {value.length}/{max}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
