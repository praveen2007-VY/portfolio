import Image from "next/image";
import { Check, GraduationCap, Mail, MapPin } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { initials, paragraphs } from "@/lib/utils/format";
import type { PortfolioData } from "@/types/portfolio";

export function About({ data }: { data: PortfolioData }) {
  const { profile, settings } = data;
  const bio = paragraphs(profile.about);
  const edu = data.education[0];

  return (
    <Section id="about" config={settings.sections.about}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-haze via-paper to-accent-soft p-2 shadow-soft">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-ink">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`Portrait of ${profile.full_name}`}
                  fill
                  sizes="(min-width: 1024px) 400px, 90vw"
                  className="object-cover"
                />
              ) : (
                <div aria-hidden className="absolute inset-0">
                  <div className="hairline-grid absolute inset-0 opacity-40 invert" />
                  <div className="absolute -top-1/4 -right-1/4 size-[90%] rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.7),transparent_60%)] blur-2xl" />
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="font-mono text-[clamp(4rem,10vw,7rem)] font-semibold tracking-tighter text-white/90">
                      {initials(profile.full_name)}
                    </span>
                  </div>
                </div>
              )}
              <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/15 bg-black/35 p-4 text-white backdrop-blur-md">
                <p className="text-[15px] font-semibold tracking-tight">{profile.full_name}</p>
                {profile.headline && (
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-white/75">
                    {profile.headline.split("|").slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5 text-sm text-ink-2">
            {profile.location && (
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 text-accent" aria-hidden />
                {profile.location}
              </li>
            )}
            {edu && (
              <li className="flex items-center gap-2.5">
                <GraduationCap className="size-4 text-accent" aria-hidden />
                {[edu.degree, edu.field].filter(Boolean).join(", ")}
              </li>
            )}
            {profile.email && (
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-accent" aria-hidden />
                <a className="underline-offset-4 hover:text-accent hover:underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </li>
            )}
          </ul>
        </Reveal>

        <div>
          <Reveal delay={0.05}>
            {bio.length ? (
              <div className="space-y-5 text-[17px] leading-[1.75] text-pretty text-ink-2 sm:text-lg">
                {bio.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-ink first-letter:font-semibold" : undefined}>
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted">A short biography will appear here soon.</p>
            )}
          </Reveal>

          {profile.focus_areas.length > 0 && (
            <Reveal delay={0.1} className="mt-10">
              <h3 className="font-mono text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
                Focus areas
              </h3>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {profile.focus_areas.map((area) => (
                  <li
                    key={area}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-[14.5px] font-medium text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-soft"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    {area}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </div>
    </Section>
  );
}
