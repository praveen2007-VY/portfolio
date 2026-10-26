import Link from "next/link";
import { Eye } from "lucide-react";

export function PreviewBanner() {
  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div
        role="status"
        className="flex items-center gap-3 rounded-full border border-ink/10 bg-ink py-2 pr-2 pl-4 text-[13px] text-white shadow-lift"
      >
        <Eye className="size-4 text-white/70" aria-hidden />
        <span>
          Preview — includes drafts and unpublished settings
        </span>
        <Link href="/admin" className="rounded-full bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export function SetupNotice() {
  return (
    <div className="relative z-[60] bg-ink px-4 py-2 text-center text-[12.5px] text-white/80">
      Showing built-in resume content. Connect Supabase (see README) to manage this portfolio from the dashboard.
    </div>
  );
}
