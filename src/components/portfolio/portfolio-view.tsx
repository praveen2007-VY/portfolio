import { Hero } from "@/components/hero/hero";
import { SiteHeader, type NavLink } from "@/components/navigation/site-header";
import { MotionProvider } from "@/components/portfolio/motion-provider";
import { PreviewBanner, SetupNotice } from "@/components/portfolio/notices";
import { About } from "@/components/sections/about";
import { Achievements } from "@/components/sections/achievements";
import { Certificates } from "@/components/sections/certificates";
import { CodingStats } from "@/components/sections/coding-stats";
import { Contact } from "@/components/sections/contact";
import { Journey } from "@/components/sections/journey";
import { Projects } from "@/components/sections/projects";
import { SiteFooter } from "@/components/sections/site-footer";
import { Skills } from "@/components/sections/skills";
import { AmbientBackground } from "@/components/portfolio/ambient-background";
import { initials } from "@/lib/utils/format";
import type { PortfolioData, SectionKey } from "@/types/portfolio";

const NAV: { id: string; label: string; section: SectionKey }[] = [
  { id: "about", label: "About", section: "about" },
  { id: "experience", label: "Experience", section: "experience" },
  { id: "skills", label: "Skills", section: "skills" },
  { id: "projects", label: "Projects", section: "projects" },
  { id: "certificates", label: "Certificates", section: "certificates" },
  { id: "contact", label: "Contact", section: "contact" },
];

const FOOTER_EXTRA: { id: string; label: string; section: SectionKey }[] = [
  { id: "achievements", label: "Achievements", section: "achievements" },
  { id: "coding", label: "Coding", section: "coding" },
];

export function PortfolioView({ data, mode }: { data: PortfolioData; mode: "public" | "preview" }) {
  const sections = data.settings.sections;
  const links: NavLink[] = NAV.filter((l) => sections[l.section].visible);
  const footerLinks: NavLink[] = [...NAV, ...FOOTER_EXTRA].filter((l) => sections[l.section].visible);
  const basePath = mode === "preview" ? "/preview" : "";

  return (
    <MotionProvider reduced={data.settings.animation_level === "reduced"}>
      <div data-accent={data.settings.accent} className="relative overflow-x-clip">
        <AmbientBackground />
        <a
          href="#main"
          className="sr-only z-[70] rounded-lg bg-accent px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {data.source === "fallback" && process.env.NODE_ENV !== "production" && <SetupNotice />}
        <SiteHeader
          name={data.profile.full_name}
          initials={initials(data.profile.full_name)}
          links={links}
          hasResume={data.profile.has_resume}
        />
        <main id="main">
          <Hero data={data} />
          {sections.about.visible && <About data={data} />}
          {sections.experience.visible && <Journey data={data} />}
          {sections.skills.visible && <Skills data={data} />}
          {sections.projects.visible && <Projects data={data} basePath={basePath} />}
          {sections.certificates.visible && <Certificates data={data} />}
          {sections.achievements.visible && <Achievements data={data} />}
          {sections.coding.visible && <CodingStats data={data} />}
          {sections.contact.visible && <Contact data={data} />}
        </main>
        <SiteFooter data={data} links={footerLinks} year={new Date(data.generatedAt).getFullYear()} />
        {mode === "preview" && <PreviewBanner />}
      </div>
    </MotionProvider>
  );
}
