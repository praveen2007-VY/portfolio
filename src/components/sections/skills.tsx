import {
  BrainCircuit,
  Cloud,
  Code2,
  Cpu,
  Database,
  LayoutTemplate,
  Server,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState, Section } from "@/components/ui/section";
import type { PortfolioData, SkillRow } from "@/types/portfolio";

const ICONS: [RegExp, LucideIcon][] = [
  [/language|programming/i, Code2],
  [/front|ui|web/i, LayoutTemplate],
  [/back|server|api/i, Server],
  [/data ?base|sql|storage/i, Database],
  [/cloud|devops|aws/i, Cloud],
  [/ai|machine|ml|vision|nlp|intelligence/i, BrainCircuit],
  [/tool/i, Wrench],
  [/core|computer|science|algorithm/i, Cpu],
];

function iconFor(category: string): LucideIcon {
  return ICONS.find(([re]) => re.test(category))?.[1] ?? Cpu;
}

/** Groups skills by category, ordering categories by their first skill. */
export function groupSkills(skills: SkillRow[]) {
  const groups = new Map<string, SkillRow[]>();
  for (const skill of skills) groups.set(skill.category, [...(groups.get(skill.category) ?? []), skill]);
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

export function Skills({ data }: { data: PortfolioData }) {
  const groups = groupSkills(data.skills);
  return (
    <Section id="skills" config={data.settings.sections.skills} className="relative">
      {/* Subtle ambient lighting for light mode */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[380px] w-full max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(37,99,235,0.06),transparent_70%)] dark:hidden"
      />

      {groups.length === 0 ? (
        <EmptyState title="Skills coming soon" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ category, items }, index) => {
            const Icon = iconFor(category);
            return (
              <Reveal key={category} delay={index * 0.05}>
                <article className="group showcase-card h-full justify-between p-6">
                  {/* Light mode soft blue aura on hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.12),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:hidden"
                  />
                  {/* Dark mode accent glow on hover (exact original) */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 size-52 rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.16),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 hidden dark:block"
                  />

                  <div>
                    {/* Header: Icon container and Count */}
                    <div className="flex items-center justify-between">
                      <span className="showcase-icon-box">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="showcase-count">
                        {String(items.length).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Category Title */}
                    <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-blue-950 dark:text-ink dark:group-hover:text-ink">
                      {category}
                    </h3>
                  </div>

                  {/* Skills Pills */}
                  <ul className="mt-5 flex flex-wrap gap-1.5" aria-label={`${category} skills`}>
                    {items.map((skill) => (
                      <li key={skill.id} className="showcase-pill">
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </Section>
  );
}
