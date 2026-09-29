import type { MetadataRoute } from "next";
import { listPublishedGuides } from "@/app/lib/guidesData";

const BASE = "https://www.aeroparkdirect.co.uk";

// Public, indexable content pages only. Funnel/transactional routes
// (/select-service, /results, /checkout, /success, /manage) and /admin are
// intentionally excluded — they carry query params or private data and add no
// SEO value.
// Rebuilt hourly and whenever a guide is published (revalidatePath).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/",                         priority: 1.0, changeFrequency: "daily" },
    { path: "/luton-airport-parking",    priority: 0.9, changeFrequency: "weekly" },
    { path: "/heathrow-airport-parking", priority: 0.9, changeFrequency: "weekly" },
    { path: "/heathrow-meet-and-greet",      priority: 0.8, changeFrequency: "weekly" },
    { path: "/heathrow-terminal-2-parking",  priority: 0.8, changeFrequency: "weekly" },
    { path: "/heathrow-terminal-3-parking",  priority: 0.8, changeFrequency: "weekly" },
    { path: "/heathrow-terminal-4-parking",  priority: 0.8, changeFrequency: "weekly" },
    { path: "/heathrow-terminal-5-parking",  priority: 0.8, changeFrequency: "weekly" },
    { path: "/luton-meet-and-greet",         priority: 0.8, changeFrequency: "weekly" },
    { path: "/luton-park-and-ride",          priority: 0.8, changeFrequency: "weekly" },
    { path: "/heathrow-park-and-ride",       priority: 0.8, changeFrequency: "weekly" },
    { path: "/airport-parking-price-guide", priority: 0.7, changeFrequency: "daily" },
    { path: "/guides",                   priority: 0.6, changeFrequency: "weekly" },
    { path: "/how-it-works",             priority: 0.6, changeFrequency: "monthly" },
    { path: "/services",                 priority: 0.6, changeFrequency: "monthly" },
    { path: "/about",                    priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact",                  priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy",                  priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms",                    priority: 0.2, changeFrequency: "yearly" },
  ];

  const guides = await listPublishedGuides().catch(() => []);

  return [
    ...pages.map((p) => ({
      url: `${BASE}${p.path}`,
      lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...guides.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: new Date(g.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
