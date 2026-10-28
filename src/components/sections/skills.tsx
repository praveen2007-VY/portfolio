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
    <Section id="skills" config={data.settings.sections.skills}>
      {groups.length === 0 ? (
        <EmptyState title="Skills coming soon" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ category, items }, index) => {
            const Icon = iconFor(category);
            return (
              <Reveal key={category} delay={index * 0.06}>
                <article className="group relative h-full overflow-hidden rounded-2xl border border-line bg-paper p-6 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-accent/45 hover:shadow-lift dark:hover:border-sky-400/35">
                  <div
                    aria-hidden
                    className="absolute -top-24 -right-24 size-52 rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.16),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent transition-all duration-500 group-hover:scale-105 group-hover:rotate-[-6deg] group-hover:bg-accent group-hover:text-white dark:group-hover:bg-sky-400 dark:group-hover:text-[#070b16]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-[11px] text-subtle">
                      {String(items.length).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-ink">{category}</h3>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {items.map((skill) => (
                      <li
                        key={skill.id}
                        className="chip transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent-soft hover:text-accent-strong dark:hover:border-sky-400/40 dark:hover:bg-sky-400/10 dark:hover:text-sky-300"
                      >
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
