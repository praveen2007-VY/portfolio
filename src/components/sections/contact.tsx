import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/sections/contact-form";
import { socialLinksFor } from "@/components/sections/social-links";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import type { PortfolioData } from "@/types/portfolio";

export function Contact({ data }: { data: PortfolioData }) {
  const { profile } = data;
  const channels = [
    profile.email && { href: `mailto:${profile.email}`, label: "Email", value: profile.email, Icon: Mail },
    profile.phone && {
      href: `tel:${profile.phone.replace(/[^\d+]/g, "")}`,
      label: "Phone",
      value: profile.phone,
      Icon: Phone,
    },
  ].filter(Boolean) as { href: string; label: string; value: string; Icon: typeof Mail }[];
  const socials = socialLinksFor(profile);

  return (
    <Section id="contact" config={data.settings.sections.contact}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <Reveal className="space-y-3">
          {channels.map(({ href, label, value, Icon }) => (
            <a
              key={label}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-paper p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-soft"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-muted">{label}</span>
                <span className="block truncate text-[15.5px] font-medium text-ink">{value}</span>
              </span>
              <ArrowUpRight
                className="size-4 text-subtle transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                aria-hidden
              />
            </a>
          ))}
          {profile.location && (
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-mist/60 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper text-ink-2">
                <MapPin className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-[12.5px] text-muted">Based in</span>
                <span className="block text-[15.5px] font-medium text-ink">{profile.location}</span>
              </span>
            </div>
          )}
          {socials.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-[14px] font-medium text-ink-2 transition-colors hover:border-ink/20 hover:text-ink"
                >
                  <Icon size={16} />
                  {label}
                </a>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal delay={0.08} className="relative">
          {data.contactEnabled ? (
            <ContactForm />
          ) : (
            <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-line-strong bg-mist/50 p-8">
              <p className="text-lg font-semibold text-ink">The contact form is offline right now</p>
              <p className="mt-2 text-muted">
                {profile.email
                  ? "Email is the quickest way to reach me — I read every message."
                  : "Please reach out through one of the links on this page."}
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
