"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { discardUpload } from "@/lib/actions/uploads";
import type { UploadKind, UploadLimits } from "@/lib/uploads/config";

/**
 * Tracks files uploaded while a form is open but not yet saved, so that
 * cancelling (or replacing them before saving) deletes the orphaned objects.
 */
type UploadSession = {
  limits: UploadLimits;
  track: (kind: UploadKind, path: string) => void;
  isPending: (path: string) => boolean;
  discard: (path: string) => void;
  discardAll: () => void;
  commit: () => void;
};

const UploadSessionContext = createContext<UploadSession | null>(null);

export function useUploadSession() {
  const ctx = useContext(UploadSessionContext);
  if (!ctx) throw new Error("useUploadSession must be used inside UploadSessionProvider");
  return ctx;
}

export function UploadSessionProvider({ limits, children }: { limits: UploadLimits; children: React.ReactNode }) {
  const pending = useRef(new Map<string, UploadKind>());

  const track = useCallback((kind: UploadKind, path: string) => {
    pending.current.set(path, kind);
  }, []);
  const isPending = useCallback((path: string) => pending.current.has(path), []);
  const discard = useCallback((path: string) => {
    const kind = pending.current.get(path);
    if (!kind) return;
    pending.current.delete(path);
    void discardUpload(kind, path);
  }, []);
  const discardAll = useCallback(() => {
    for (const [path, kind] of pending.current) void discardUpload(kind, path);
    pending.current.clear();
  }, []);
  const commit = useCallback(() => pending.current.clear(), []);

  // Leaving the page without saving discards anything uploaded in the meantime.
  useEffect(() => discardAll, [discardAll]);

  const value = useMemo(
    () => ({ limits, track, isPending, discard, discardAll, commit }),
    [limits, track, isPending, discard, discardAll, commit],
  );
  return <UploadSessionContext.Provider value={value}>{children}</UploadSessionContext.Provider>;
}
