import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { getPublishedPortfolio } from "@/lib/data/portfolio";

export async function generateMetadata(): Promise<Metadata> {
  const { settings, profile } = await getPublishedPortfolio();
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
  const data = await getPublishedPortfolio();
  return <PortfolioView data={data} mode="public" />;
}
