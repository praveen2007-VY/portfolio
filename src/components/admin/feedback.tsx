"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/format";

type Toast = { id: number; kind: "success" | "error"; message: string };
type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
};

type FeedbackContextValue = {
  toast: (kind: Toast["kind"], message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const nextId = useRef(1);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    requestAnimationFrame(() => dialog.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    dialog.current?.close();
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-paper px-4 py-3 text-sm shadow-lift",
              t.kind === "error" ? "border-danger/25" : "border-line",
            )}
          >
            {t.kind === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            )}
            <p className="flex-1 text-ink-2">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-subtle hover:text-ink"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <dialog
        ref={dialog}
        onClose={() => {
          resolver.current?.(false);
          resolver.current = null;
          setConfirmState(null);
        }}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(92vw,420px)] rounded-2xl border border-line bg-paper text-ink p-6 shadow-lift backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {confirmState && (
          <>
            <h2 id="confirm-title" className="text-lg font-semibold text-ink">
              {confirmState.title}
            </h2>
            {confirmState.description && <p className="mt-2 text-sm text-muted">{confirmState.description}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => settle(false)} autoFocus>
                Cancel
              </Button>
              <Button variant={confirmState.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)}>
                {confirmState.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </>
        )}
      </dialog>
    </FeedbackContext.Provider>
  );
}
