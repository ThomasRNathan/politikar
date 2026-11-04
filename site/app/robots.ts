import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/seo";

// Generates /robots.txt. While the site is not indexable (pre-launch /
// illustrative scores) we disallow all crawling; once SITE_INDEXABLE is
// enabled we open it up and advertise the sitemap.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
