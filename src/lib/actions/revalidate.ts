import "server-only";
import { refresh, updateTag } from "next/cache";
import { PORTFOLIO_TAG } from "@/lib/data/portfolio";

/** Call from Server Actions after any change that affects the public site. */
export function revalidatePortfolio() {
  updateTag(PORTFOLIO_TAG);
  refresh();
}

/** Call from Server Actions after admin-only changes (drafts, messages). */
export function refreshAdmin() {
  refresh();
}
