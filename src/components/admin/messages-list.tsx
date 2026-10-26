"use client";

import { useTransition } from "react";
import { Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/admin/feedback";
import { Button } from "@/components/ui/button";
import { deleteMessage, setMessageRead } from "@/lib/actions/messages";
import { cn, formatDateTime } from "@/lib/utils/format";
import type { ContactMessageRow } from "@/types/portfolio";

export function MessagesList({ messages }: { messages: ContactMessageRow[] }) {
  const { toast, confirm } = useFeedback();
  const [pending, startTransition] = useTransition();

  function toggleRead(message: ContactMessageRow) {
    startTransition(async () => {
      const result = await setMessageRead(message.id, !message.is_read);
      if (!result.ok) toast("error", result.error);
    });
  }

  async function remove(message: ContactMessageRow) {
    const ok = await confirm({
      title: "Delete this message?",
      description: `From ${message.name}. This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteMessage(message.id);
      toast(result.ok ? "success" : "error", result.ok ? "Message deleted." : result.error);
    });
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
        <p className="font-medium text-ink">No messages yet</p>
        <p className="mt-1 text-sm text-muted">Messages sent from the contact form will appear here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((m) => (
        <li key={m.id} className={cn("card p-5", !m.is_read && "border-accent/30")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-ink">
                {!m.is_read && <span className="size-2 rounded-full bg-accent" aria-label="Unread" />}
                {m.name}
              </p>
              <a href={`mailto:${m.email}`} className="text-sm text-accent hover:underline">
                {m.email}
              </a>
            </div>
            <p className="text-[12.5px] text-muted">{formatDateTime(m.created_at)}</p>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-2">{m.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-[13px] font-medium text-accent-strong hover:bg-accent/15"
            >
              <Reply className="size-3.5" aria-hidden /> Reply
            </a>
            <Button variant="ghost" size="sm" onClick={() => toggleRead(m)} disabled={pending}>
              {m.is_read ? <Mail className="size-3.5" aria-hidden /> : <MailOpen className="size-3.5" aria-hidden />}
              Mark as {m.is_read ? "unread" : "read"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => remove(m)} disabled={pending}>
              <Trash2 className="size-3.5" aria-hidden /> Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
