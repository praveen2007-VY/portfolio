"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Plus,
  ScanEye,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useFeedback } from "@/components/admin/feedback";
import { RESOURCE_UI, type Row } from "@/components/admin/resource-configs";
import { ResourceForm } from "@/components/admin/resource-form";
import { UploadSessionProvider, useUploadSession } from "@/components/admin/upload-session";
import { Button } from "@/components/ui/button";
import {
  deleteResource,
  renameSkillCategory,
  reorderResource,
  setResourceFlag,
} from "@/lib/actions/content";
import type { ResourceKey } from "@/lib/admin/resources";
import { mediaUrl } from "@/lib/supabase/storage";
import type { UploadLimits } from "@/lib/uploads/config";
import { cn } from "@/lib/utils/format";

type ResourceManagerProps = {
  resource: ResourceKey;
  rows: Row[];
  limits: UploadLimits;
  openNew?: boolean;
  compact?: boolean;
};

export function ResourceManager(props: ResourceManagerProps) {
  return (
    <UploadSessionProvider limits={props.limits}>
      <ResourceManagerInner {...props} />
    </UploadSessionProvider>
  );
}

function ResourceManagerInner({ resource, rows, openNew = false, compact = false }: ResourceManagerProps) {
  const ui = RESOURCE_UI[resource];
  const { toast, confirm } = useFeedback();
  const session = useUploadSession();
  const [items, setItems] = useState(rows);
  const [prevRows, setPrevRows] = useState(rows);
  const [editing, setEditing] = useState<{ row: Row | null } | null>(openNew ? { row: null } : null);
  const dirty = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  // Server refreshes deliver new rows; adopt them (adjusting state during render).
  if (rows !== prevRows) {
    setPrevRows(rows);
    setItems(rows);
  }
  useEffect(() => {
    if (editing && !dialog.current?.open) dialog.current?.showModal();
    if (!editing && dialog.current?.open) dialog.current.close();
  }, [editing]);

  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  async function requestClose() {
    if (dirty.current) {
      const ok = await confirm({
        title: "Discard unsaved changes?",
        description: "Your edits and any files uploaded in this form will be discarded.",
        confirmLabel: "Discard",
        tone: "danger",
      });
      if (!ok) return;
    }
    session.discardAll();
    dirty.current = false;
    setEditing(null);
  }

  function openEditor(row: Row | null) {
    dirty.current = false;
    setEditing({ row });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (success) toast("success", success);
      } else {
        toast("error", result.error ?? "Something went wrong.");
        setItems(rows);
      }
    });
  }

  function toggle(row: Row, flag: "is_published" | "is_featured") {
    const value = !row[flag];
    setItems((list) => list.map((r) => (r.id === row.id ? { ...r, [flag]: value } : r)));
    const message =
      flag === "is_featured"
        ? value
          ? "Marked as featured."
          : "Removed from featured."
        : ui.visibilityLabels
          ? value
            ? "Now visible publicly."
            : "Hidden from the public site."
          : value
            ? "Published."
            : "Unpublished — now a draft.";
    run(() => setResourceFlag(resource, row.id, flag, value), message);
  }

  async function remove(row: Row) {
    const name = ui.summary(row).title || ui.singular;
    const ok = await confirm({
      title: `Delete “${name}”?`,
      description: `This permanently deletes the ${ui.singular}${ui.imageBucket ? " and its uploaded files" : ""}. This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setItems((list) => list.filter((r) => r.id !== row.id));
    run(() => deleteResource(resource, row.id), `${capitalize(ui.singular)} deleted.`);
  }

  function commitOrder(next: Row[]) {
    setItems(next);
    run(() => reorderResource(resource, next.map((r) => r.id)));
  }

  function move(row: Row, delta: number, scope: Row[]) {
    const index = scope.findIndex((r) => r.id === row.id);
    const target = index + delta;
    if (target < 0 || target >= scope.length) return;
    const reordered = [...scope];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    // Place the reordered scope back into the positions it occupies in the full list.
    const positions = items.map((r, i) => (scope.some((s) => s.id === r.id) ? i : -1)).filter((i) => i >= 0);
    const next = [...items];
    positions.forEach((pos, i) => (next[pos] = reordered[i]));
    commitOrder(next);
  }

  const groups = useMemo(() => {
    if (ui.groupBy !== "category") return null;
    const map = new Map<string, Row[]>();
    for (const item of items) {
      const key = String(item.category ?? "");
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items, ui.groupBy]);

  function moveGroup(index: number, delta: number) {
    if (!groups) return;
    const target = index + delta;
    if (target < 0 || target >= groups.length) return;
    const reordered = [...groups];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    commitOrder(reordered.flatMap(([, list]) => list));
  }

  async function renameGroup(from: string) {
    const to = window.prompt(`Rename category “${from}” to:`, from)?.trim();
    if (!to || to === from) return;
    setItems((list) => list.map((r) => (r.category === from ? { ...r, category: to } : r)));
    run(() => renameSkillCategory(from, to), "Category renamed.");
  }

  const renderList = (list: Row[]) => (
    <ul className="divide-y divide-line">
      {list.map((row, index) => (
        <ItemRow
          key={row.id}
          row={row}
          resource={resource}
          first={index === 0}
          last={index === list.length - 1}
          disabled={pending}
          onEdit={() => openEditor(row)}
          onToggle={(flag) => toggle(row, flag)}
          onDelete={() => remove(row)}
          onMove={(delta) => move(row, delta, list)}
        />
      ))}
    </ul>
  );

  const publishedCount = items.filter((r) => r.is_published).length;
  // The first manager on a page is the page title; compact ones are subsections.
  const Heading = compact ? "h2" : "h1";

  return (
    <section aria-labelledby={`${resource}-title`}>
      <div className={cn("flex flex-wrap items-end justify-between gap-4", compact ? "mb-4" : "mb-6")}>
        <div>
          <Heading id={`${resource}-title`} className={cn("font-semibold tracking-tight text-ink", compact ? "text-lg" : "text-2xl sm:text-3xl")}>
            {ui.title}
          </Heading>
          <p className="mt-1 text-sm text-muted">
            {ui.description}{" "}
            <span className="whitespace-nowrap">
              ({items.length} total · {publishedCount} {ui.visibilityLabels ? "visible" : "published"})
            </span>
          </p>
        </div>
        <Button onClick={() => openEditor(null)}>
          <Plus className="size-4" aria-hidden /> New {ui.singular}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="font-medium text-ink">No {ui.title.toLowerCase()} yet</p>
          <p className="mt-1 text-sm text-muted">Create the first {ui.singular} to show it on your portfolio.</p>
          <Button className="mt-5" onClick={() => openEditor(null)}>
            <Plus className="size-4" aria-hidden /> New {ui.singular}
          </Button>
        </div>
      ) : groups ? (
        <div className="space-y-5">
          {groups.map(([category, list], index) => (
            <div key={category} className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-mist/60 px-4 py-2.5">
                <p className="text-sm font-semibold text-ink">
                  {category || "Uncategorised"} <span className="font-mono text-xs font-normal text-muted">{list.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <IconButton label={`Move ${category} category up`} onClick={() => moveGroup(index, -1)} disabled={index === 0 || pending}>
                    <ArrowUp className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Move ${category} category down`}
                    onClick={() => moveGroup(index, 1)}
                    disabled={index === groups.length - 1 || pending}
                  >
                    <ArrowDown className="size-4" />
                  </IconButton>
                  <Button variant="ghost" size="sm" onClick={() => renameGroup(category)} disabled={pending}>
                    <Pencil className="size-3.5" aria-hidden /> Rename
                  </Button>
                </div>
              </div>
              {renderList(list)}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">{renderList(items)}</div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={`${resource}-editor-title`}
        onCancel={(event) => {
          event.preventDefault();
          void requestClose();
        }}
        className="mt-0 mr-0 mb-0 ml-auto h-dvh max-h-dvh w-[min(100vw,720px)] max-w-none border-l border-line bg-paper p-0 shadow-lift backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]"
      >
        {editing && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
              <div>
                <h2 id={`${resource}-editor-title`} className="text-lg font-semibold text-ink">
                  {editing.row ? `Edit ${ui.singular}` : `New ${ui.singular}`}
                </h2>
                {editing.row && (
                  <p className="text-[13px] text-muted">
                    {editing.row.is_published ? (ui.visibilityLabels?.on ?? "Published") : (ui.visibilityLabels?.off ?? "Draft")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void requestClose()}
                className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-mist"
                aria-label="Close editor"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ResourceForm
                key={editing.row?.id ?? "new"}
                ui={ui}
                row={editing.row}
                rows={items}
                onDirtyChange={setDirty}
                onDone={() => {
                  dirty.current = false;
                  setEditing(null);
                }}
              />
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

function ItemRow({
  row,
  resource,
  first,
  last,
  disabled,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}: {
  row: Row;
  resource: ResourceKey;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onEdit: () => void;
  onToggle: (flag: "is_published" | "is_featured") => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  const ui = RESOURCE_UI[resource];
  const summary = ui.summary(row);
  const image = ui.imageBucket === "media" ? mediaUrl(summary.image ?? null) : null;
  const showThumb = Boolean(ui.imageBucket);
  const published = row.is_published;

  return (
    <li className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center", !published && "bg-mist/40")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showThumb && (
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-mist">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
              <img src={image} alt="" className="size-full object-cover" />
            ) : (
              <FileText className="size-5 text-subtle" aria-hidden />
            )}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onEdit} className="truncate text-left text-[15px] font-medium text-ink hover:text-accent">
              {summary.title || "Untitled"}
            </button>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                published ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
              )}
            >
              {published ? (ui.visibilityLabels?.on ?? "Published") : (ui.visibilityLabels?.off ?? "Draft")}
            </span>
            {ui.featured && Boolean(row.is_featured) && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                Featured
              </span>
            )}
          </div>
          {summary.subtitle && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{summary.subtitle}</p>}
          {summary.meta && <p className="mt-0.5 line-clamp-1 font-mono text-[11.5px] text-subtle">{summary.meta}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:justify-end">
        <IconButton label="Move up" onClick={() => onMove(-1)} disabled={first || disabled}>
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton label="Move down" onClick={() => onMove(1)} disabled={last || disabled}>
          <ArrowDown className="size-4" />
        </IconButton>
        <IconButton
          label={published ? (ui.visibilityLabels ? "Hide" : "Unpublish") : ui.visibilityLabels ? "Show" : "Publish"}
          onClick={() => onToggle("is_published")}
          disabled={disabled}
        >
          {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </IconButton>
        {ui.featured && (
          <IconButton
            label={row.is_featured ? "Remove from featured" : "Mark as featured"}
            onClick={() => onToggle("is_featured")}
            disabled={disabled}
            active={Boolean(row.is_featured)}
          >
            <Star className={cn("size-4", Boolean(row.is_featured) && "fill-current")} />
          </IconButton>
        )}
        {ui.previewHref && (
          <Link
            href={ui.previewHref(row)}
            target="_blank"
            className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-mist hover:text-ink"
            aria-label="Preview"
            title="Preview"
          >
            <ScanEye className="size-4" aria-hidden />
          </Link>
        )}
        <IconButton label="Edit" onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
        <IconButton label="Delete" onClick={onDelete} disabled={disabled} danger>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        danger ? "text-ink-2 hover:bg-danger/10 hover:text-danger" : "text-ink-2 hover:bg-mist hover:text-ink",
        active && "text-accent",
      )}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
