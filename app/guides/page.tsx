import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AIRPORT_LABEL, readingMinutes } from "@/app/lib/guides";
import { listPublishedGuides } from "@/app/lib/guidesData";

// Rebuilt when a guide is published in admin (revalidatePath) and hourly.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Airport Parking Guides | Luton & Heathrow | AeroPark Direct",
  description: "Practical guides to parking at Luton and Heathrow: where to meet your driver, drop-off charges, what to do if your flight is delayed, and more.",
  alternates: { canonical: "/guides" },
};

export default async function GuidesPage() {
  const guides = await listPublishedGuides();
  return (
    <>
      <SiteHeader />
      <main className="bg-white font-sans antialiased text-slate-900">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Airport parking guides</h1>
          <p className="mt-3 text-lg text-slate-600">
            Straight answers about parking at Luton and Heathrow, from the team that arranges it every day.
          </p>

          {guides.length === 0 ? (
            <p className="mt-10 text-slate-600">Our first guides are on their way. In the meantime, <Link href="/how-it-works" className="text-blue-700 underline underline-offset-4">see how it works</Link>.</p>
          ) : (
            <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {guides.map((g) => (
                <li key={g.id}>
                  <Link href={`/guides/${g.slug}`} className="group block py-6">
                    <p className="text-sm text-slate-500">
                      {g.airport ? `${AIRPORT_LABEL[g.airport]} · ` : ""}{readingMinutes(g.body)} min read
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900 group-hover:text-blue-700">{g.title}</h2>
                    {g.summary && <p className="mt-1.5 text-slate-600 leading-relaxed">{g.summary}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
