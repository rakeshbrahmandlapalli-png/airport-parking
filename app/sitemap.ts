import type { MetadataRoute } from "next";

const BASE = "https://www.aeroparkdirect.co.uk";

// Public, indexable content pages only. Funnel/transactional routes
// (/select-service, /results, /checkout, /success, /manage) and /admin are
// intentionally excluded — they carry query params or private data and add no
// SEO value.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/",                         priority: 1.0, changeFrequency: "daily" },
    { path: "/luton-airport-parking",    priority: 0.9, changeFrequency: "weekly" },
    { path: "/heathrow-airport-parking", priority: 0.9, changeFrequency: "weekly" },
    { path: "/how-it-works",             priority: 0.6, changeFrequency: "monthly" },
    { path: "/services",                 priority: 0.6, changeFrequency: "monthly" },
    { path: "/about",                    priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact",                  priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy",                  priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms",                    priority: 0.2, changeFrequency: "yearly" },
  ];

  return pages.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
