const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** '2026' -> '2026', '2026-05' -> 'May 2026', '2026-05-14' -> '14 May 2026'. */
export function formatPartialDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!month) return year;
  const name = MONTHS[Number(month) - 1] ?? "";
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent = false,
): string {
  const from = formatPartialDate(start);
  const to = isCurrent ? "Present" : formatPartialDate(end);
  if (from && to) return from === to ? from : `${from} — ${to}`;
  return from || to;
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** A conservative lower bound such as '530+' for a sum of solved counts. */
export function roundedDownPlus(total: number): string {
  if (total < 10) return `${total}`;
  const step = total >= 1000 ? 100 : 10;
  return `${Math.floor(total / step) * step}+`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/** Splits `text` around the first occurrence of `highlight`. */
export function splitHighlight(text: string, highlight: string | null | undefined) {
  if (!highlight) return { before: text, match: "", after: "" };
  const index = text.indexOf(highlight);
  if (index === -1) return { before: text, match: "", after: "" };
  return {
    before: text.slice(0, index),
    match: highlight,
    after: text.slice(index + highlight.length),
  };
}
