import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/seo";
import { POLITICIANS, PARTIES, FUNCTIONS, REGIONS } from "@/lib/fixtures";

// Generates /sitemap.xml from the referential. Empty while the site is
// not indexable, so it never advertises pages before launch.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_INDEXABLE) return [];

  const staticPaths = [
    "",
    "/politiciens",
    "/partis",
    "/fonctions",
    "/methode",
    "/classement",
  ];

  const entityPaths = [
    ...POLITICIANS.map((p) => `/politiciens/${p.slug}`),
    ...PARTIES.map((p) => `/partis/${p.slug}`),
    ...FUNCTIONS.map((f) => `/fonctions/${f.slug}`),
    ...REGIONS.map((r) => `/regions/${r.slug}`),
  ];

  return [...staticPaths, ...entityPaths].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}
