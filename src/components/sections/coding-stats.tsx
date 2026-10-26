import { ArrowUpRight } from "lucide-react";
import { CodeChefIcon, LeetCodeIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState, Section } from "@/components/ui/section";
import { roundedDownPlus } from "@/lib/utils/format";
import type { PortfolioData } from "@/types/portfolio";

function PlatformIcon({ platform }: { platform: string }) {
  if (/leet/i.test(platform)) return <LeetCodeIcon size={20} />;
  if (/chef/i.test(platform)) return <CodeChefIcon size={20} />;
  return <span className="font-mono text-sm font-semibold">{platform.slice(0, 2).toUpperCase()}</span>;
}

export function CodingStats({ data }: { data: PortfolioData }) {
  const profiles = data.codingProfiles;
  const total = profiles.reduce((sum, p) => sum + (p.problems_solved ?? 0), 0);
  const peak = Math.max(0, ...profiles.map((p) => p.max_rating ?? 0));

  return (
    <Section id="coding" config={data.settings.sections.coding} tone="mist">
      {profiles.length === 0 ? (
        <EmptyState title="Coding statistics coming soon" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
          <Reveal className="h-full">
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-ink p-7 text-white shadow-lift sm:p-8">
              <div
                aria-hidden
                className="absolute -top-1/3 -right-1/4 size-[80%] rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.75),transparent_60%)] blur-2xl"
              />
              <div className="hairline-grid absolute inset-0 opacity-20 invert" aria-hidden />
              <p className="relative font-mono text-[11px] tracking-[0.18em] text-white/60 uppercase">Overall</p>
              <div className="relative mt-10">
                <p className="text-[clamp(3rem,2rem+4vw,4.75rem)] leading-none font-semibold tracking-[-0.05em] tabular-nums">
                  {roundedDownPlus(total)}
                </p>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/75">
                  {data.settings.coding_summary ?? "DSA problems solved across competitive programming platforms."}
                </p>
              </div>
              {peak > 0 && (
                <p className="relative mt-8 border-t border-white/15 pt-4 text-[13px] text-white/70">
                  Peak rating <span className="font-semibold text-white tabular-nums">{peak}</span>
                </p>
              )}
            </div>
          </Reveal>

          {profiles.map((p, index) => (
            <Reveal key={p.id} delay={0.06 * (index + 1)} className="h-full">
              <article className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-mist text-ink transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                      <PlatformIcon platform={p.platform} />
                    </span>
                    <div>
                      <h3 className="font-semibold tracking-tight text-ink">{p.platform}</h3>
                      {p.username && <p className="font-mono text-[12px] text-muted">@{p.username}</p>}
                    </div>
                  </div>
                  {p.profile_url && (
                    <a
                      href={p.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-9 place-items-center rounded-lg border border-line text-ink-2 transition-colors hover:border-ink/25 hover:text-ink"
                      aria-label={`${p.platform} profile`}
                    >
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
                <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-line pt-6">
                  {p.problems_solved !== null && (
                    <div>
                      <dt className="text-[12.5px] text-muted">Problems solved</dt>
                      <dd className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
                        {p.problems_solved}+
                      </dd>
                    </div>
                  )}
                  {p.max_rating !== null && (
                    <div>
                      <dt className="text-[12.5px] text-muted">Max rating</dt>
                      <dd className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
                        {p.max_rating}
                      </dd>
                    </div>
                  )}
                </dl>
                {p.note && <p className="mt-4 text-[13.5px] text-muted">{p.note}</p>}
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}
