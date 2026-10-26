import { Globe } from "lucide-react";
import { CodeChefIcon, GitHubIcon, LeetCodeIcon, LinkedInIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/format";
import type { PublicProfile } from "@/types/portfolio";

export function socialLinksFor(profile: PublicProfile) {
  return [
    { href: profile.github_url, label: "GitHub", Icon: GitHubIcon },
    { href: profile.linkedin_url, label: "LinkedIn", Icon: LinkedInIcon },
    { href: profile.leetcode_url, label: "LeetCode", Icon: LeetCodeIcon },
    { href: profile.codechef_url, label: "CodeChef", Icon: CodeChefIcon },
    { href: profile.website_url, label: "Website", Icon: Globe },
  ].filter((link): link is typeof link & { href: string } => Boolean(link.href));
}

export function SocialLinks({
  profile,
  variant = "default",
}: {
  profile: PublicProfile;
  variant?: "hero" | "default";
}) {
  const links = socialLinksFor(profile);
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {links.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group inline-flex items-center gap-2 rounded-full border border-line bg-paper text-[13px] font-medium text-ink-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:text-ink hover:shadow-soft",
              variant === "hero" ? "py-1.5 pr-3.5 pl-2" : "size-10 justify-center",
            )}
            aria-label={variant === "hero" ? undefined : label}
          >
            <span
              className={cn(
                "grid place-items-center",
                variant === "hero" && "size-6 rounded-full bg-mist transition-colors group-hover:bg-accent-soft group-hover:text-accent",
              )}
            >
              <Icon size={variant === "hero" ? 14 : 17} />
            </span>
            {variant === "hero" && label}
          </a>
        </li>
      ))}
    </ul>
  );
}
