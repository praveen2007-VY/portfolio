import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { getPublishedPortfolio } from "@/lib/data/portfolio";
import { buildFallbackPortfolio } from "@/lib/data/fallback";
import type { PortfolioData } from "@/types/portfolio";

export async function generateMetadata(): Promise<Metadata> {
  let data: PortfolioData;
  try {
    data = await getPublishedPortfolio();
  } catch {
    data = buildFallbackPortfolio("unavailable");
  }
  const { settings, profile } = data;
  const title = settings.seo_title ?? `${profile.full_name} — Portfolio`;
  const description = settings.seo_description ?? profile.headline ?? settings.hero_intro ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "profile", title, description, url: "/", siteName: profile.full_name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  let data: PortfolioData;
  try {
    data = await getPublishedPortfolio();
  } catch {
    data = buildFallbackPortfolio("unavailable");
  }
  return <PortfolioView data={data} mode="public" />;
}
