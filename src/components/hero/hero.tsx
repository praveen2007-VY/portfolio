import { ArrowDownRight, ArrowRight, Download, Mail } from "lucide-react";
import {
  HeroCopy,
  HeroItem,
  HeroOrbContainer,
  HeroBackgroundElements,
  HeroStatsContainer,
  heroBadgeItem,
  heroGreetingItem,
  heroHeadlineItem,
  heroDescriptionItem,
  heroActionsItem,
} from "@/components/hero/hero-copy";
import { HeroVisual } from "@/components/three/hero-visual";
import { buttonClasses } from "@/components/ui/button";
import { SocialLinks } from "@/components/sections/social-links";
import { ACCENT_HEX } from "@/lib/theme";
import { roundedDownPlus, splitHighlight } from "@/lib/utils/format";
import type { PortfolioData } from "@/types/portfolio";

function heroStats(data: PortfolioData) {
  const stats: { value: string; label: string }[] = [];
  const edu = data.education[0];
  if (edu?.grade) stats.push({ value: edu.grade.replace(/\.0$/, ""), label: edu.grade_label ?? "Grade" });
  const solved = data.codingProfiles.reduce((sum, p) => sum + (p.problems_solved ?? 0), 0);
  if (solved > 0) stats.push({ value: roundedDownPlus(solved), label: "DSA problems solved" });
  if (data.experiences.length) {
    stats.push({
      value: String(data.experiences.length),
      label: data.experiences.length === 1 ? "Internship" : "Internships",
    });
  }
  if (data.projects.length) stats.push({ value: String(data.projects.length), label: "Projects" });
  return stats.slice(0, 4);
}

export function Hero({ data }: { data: PortfolioData }) {
  const { settings, profile } = data;
  const title = splitHighlight(settings.hero_title, settings.hero_highlight);
  const stats = heroStats(data);
  const showProjects = settings.sections.projects.visible && data.projects.length > 0;
  const showContact = settings.sections.contact.visible;

  return (
    <section id="top" aria-label="Introduction" className="relative isolate overflow-hidden pt-24 sm:pt-28">
      {/* Step 7: Background visual elements fade in gradually */}
      <HeroBackgroundElements />

      <div className="container-page grid items-center gap-6 pb-12 lg:min-h-[calc(min(100svh,940px)-7rem)] lg:grid-cols-[1.2fr_0.8fr] lg:gap-4 lg:pb-16">
        <HeroCopy>
          {/* Step 1: Small education badge */}
          {settings.hero_eyebrow && (
            <HeroItem variant={heroBadgeItem}>
              <p className="inline-flex items-center gap-2 rounded-full border border-line/60 bg-paper/70 py-1.5 pr-3.5 pl-2 text-[12.5px] font-medium text-ink-2 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/50 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </span>
                {settings.hero_eyebrow}
              </p>
            </HeroItem>
          )}

          <h1 className="mt-6">
            {/* Step 2: Introduction text "Hi, I'm Praveen R." */}
            {settings.hero_greeting && (
              <HeroItem as="span" variant={heroGreetingItem}>
                <span className="block text-[clamp(1.15rem,0.95rem+0.9vw,1.6rem)] font-medium tracking-[-0.02em] text-ink-2">
                  {settings.hero_greeting}
                </span>
              </HeroItem>
            )}
            {/* Step 3: Main headline with subtle upward reveal */}
            <HeroItem as="span" variant={heroHeadlineItem}>
              <span className="mt-3 block text-[clamp(2.4rem,1.3rem+3.6vw,4.35rem)] leading-[1.0] font-semibold tracking-[-0.045em] text-balance text-ink">
                {title.before}
                {title.match && <span className="text-gradient-accent">{title.match}</span>}
                {title.after}
              </span>
            </HeroItem>
          </h1>

          {/* Step 4: Description */}
          {settings.hero_intro && (
            <HeroItem variant={heroDescriptionItem}>
              <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-pretty text-muted sm:text-lg">
                {settings.hero_intro}
              </p>
            </HeroItem>
          )}

          {/* Step 5a: Action buttons */}
          <HeroItem className="mt-8 flex flex-wrap items-center gap-3" variant={heroActionsItem}>
            {showProjects && (
              <a href="#projects" className={buttonClasses("primary", "lg", "group")}>
                Explore my work
                <ArrowDownRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                  aria-hidden
                />
              </a>
            )}
            {profile.has_resume && (
              <a href="/resume" className={buttonClasses("secondary", "lg")}>
                <Download className="size-4" aria-hidden />
                Download resume
              </a>
            )}
            {showContact && (
              <a href="#contact" className={buttonClasses("ghost", "lg", "group")}>
                <Mail className="size-4" aria-hidden />
                Contact me
                <ArrowRight
                  className="size-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </a>
            )}
          </HeroItem>

          {/* Step 5b: Social links */}
          <HeroItem className="mt-8" variant={heroActionsItem}>
            <SocialLinks profile={profile} variant="hero" />
          </HeroItem>
        </HeroCopy>

        {/* Step 6: 3D Animated Orb visual entrance */}
        <HeroOrbContainer>
          <HeroVisual
            accent={ACCENT_HEX[settings.accent]}
            enabled={settings.enable_3d}
            reduced={settings.animation_level === "reduced"}
          />
        </HeroOrbContainer>
      </div>

      {stats.length > 0 && (
        <HeroStatsContainer>
          <dl className="container-page grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            {stats.map((stat) => (
              <div key={stat.label} className="px-1 py-6 md:px-6 md:first:pl-0">
                <dt className="text-[13px] text-muted">{stat.label}</dt>
                <dd className="mt-1 text-[clamp(1.6rem,1.2rem+1.4vw,2.2rem)] font-semibold tracking-[-0.03em] text-ink tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </HeroStatsContainer>
      )}
    </section>
  );
}
