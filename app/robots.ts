import type { MetadataRoute } from "next";

const BASE = "https://www.aeroparkdirect.co.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/funnel routes out of the index.
      disallow: ["/admin", "/api/", "/checkout", "/success", "/manage"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
