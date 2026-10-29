import { ArrowUp } from "lucide-react";
import { SocialLinks } from "@/components/sections/social-links";
import type { NavLink } from "@/components/navigation/site-header";
import type { PortfolioData } from "@/types/portfolio";

export function SiteFooter({ data, links, year }: { data: PortfolioData; links: NavLink[]; year: number }) {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-paper">
      <div className="container-page py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="text-xl font-semibold tracking-tight text-ink">{data.profile.full_name}</p>
            {data.profile.headline && (
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{data.profile.headline}</p>
            )}
            <div className="mt-5">
              <SocialLinks profile={data.profile} />
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-[14px]">
              {links.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} className="text-muted transition-colors hover:text-ink">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-col-reverse gap-4 border-t border-line pt-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {data.profile.full_name}
            {data.settings.footer_text && <span className="mx-2 text-line-strong">/</span>}
            {data.settings.footer_text}
          </p>
          <a href="#top" className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
            Back to top <ArrowUp className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}
