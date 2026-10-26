import Image from "next/image";
import { ArrowUpRight, Trophy } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState, Section } from "@/components/ui/section";
import { formatPartialDate } from "@/lib/utils/format";
import type { PortfolioData } from "@/types/portfolio";

/** Two wide cards, then rows of three; the last row always fills the 6-column grid. */
function spanFor(index: number, total: number) {
  if (total === 1) return "lg:col-span-6";
  if (index < 2) return "lg:col-span-3";
  const rest = total - 2;
  const position = index - 2;
  const lastRowSize = rest % 3;
  if (lastRowSize !== 0 && position >= rest - lastRowSize) {
    return lastRowSize === 1 ? "lg:col-span-6" : "lg:col-span-3";
  }
  return "lg:col-span-2";
}

export function Achievements({ data }: { data: PortfolioData }) {
  const items = data.achievements;
  return (
    <Section id="achievements" config={data.settings.sections.achievements}>
      {items.length === 0 ? (
        <EmptyState title="Achievements coming soon" />
      ) : (
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={spanFor(index, items.length)}
            >
              <Reveal delay={(index % 3) * 0.06} className="h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-lift sm:p-7">
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {item.highlight && (
                        <p className="text-[clamp(1.35rem,1.1rem+0.9vw,1.85rem)] leading-tight font-semibold tracking-[-0.03em] text-accent">
                          {item.highlight}
                        </p>
                      )}
                      <h3 className="mt-2 text-[16.5px] leading-snug font-semibold tracking-tight text-ink">
                        {item.title}
                      </h3>
                    </div>
                    {item.image_url ? (
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line">
                        <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
                      </div>
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-ink-2 transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                        <Trophy className="size-[18px]" aria-hidden />
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-3 text-[14.5px] leading-relaxed text-pretty text-muted">{item.description}</p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-5 font-mono text-[11.5px] text-muted">
                    {item.category && (
                      <span className="rounded-md bg-mist px-2 py-0.5 text-ink-2">{item.category}</span>
                    )}
                    {item.organization && <span>{item.organization}</span>}
                    {item.achieved_on && <span>{formatPartialDate(item.achieved_on)}</span>}
                    {item.link_url && (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 font-sans text-[13px] font-medium text-accent"
                      >
                        Details <ArrowUpRight className="size-3.5" aria-hidden />
                        <span className="sr-only"> about {item.title}</span>
                      </a>
                    )}
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
