import type { SectionConfig } from "@/types/portfolio";
import { cn } from "@/lib/utils/format";
import { Reveal } from "@/components/ui/reveal";

type SectionProps = {
  id: string;
  config: SectionConfig;
  tone?: "paper" | "mist";
  className?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
};

export function Section({ id, config, tone = "paper", className, children, aside }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "relative scroll-mt-20 py-20 sm:py-24 lg:py-28",
        tone === "mist" && "bg-mist",
        className,
      )}
    >
      <div className="container-page">
        <Reveal className="mb-10 flex flex-col gap-6 sm:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {config.eyebrow && (
              <p className="eyebrow">
                <span aria-hidden className="h-px w-6 bg-accent/60" />
                {config.eyebrow}
              </p>
            )}
            <h2
              id={headingId}
              className="mt-4 text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-ink"
            >
              {config.title}
            </h2>
            {config.description && (
              <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-pretty text-muted sm:text-base">
                {config.description}
              </p>
            )}
          </div>
          {aside}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-paper/60 px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{children}</p>}
    </div>
  );
}
