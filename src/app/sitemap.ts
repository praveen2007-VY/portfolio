import type { MetadataRoute } from "next";
import { getPublishedPortfolio } from "@/lib/data/portfolio";
import { getSiteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const data = await getPublishedPortfolio();
  return [
    { url: `${site}/`, changeFrequency: "monthly", priority: 1 },
    ...data.projects.map((p) => ({
      url: `${site}/projects/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
