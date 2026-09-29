import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AIRPORT_LABEL, readingMinutes, renderGuideBody } from "@/app/lib/guides";
import { getPublishedGuide } from "@/app/lib/guidesData";
import { COMPANY } from "@/app/lib/company";

// Rendered on first visit and cached; publishing or editing in admin refreshes it.
export const revalidate = 3600;

const BASE = "https://www.aeroparkdirect.co.uk";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await getPublishedGuide(slug);
  if (!g) return { title: "Guide not found | AeroPark Direct", robots: { index: false } };
  return {
    title: `${g.title} | AeroPark Direct`,
    description: g.summary || undefined,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.summary || undefined, url: `${BASE}/guides/${g.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getPublishedGuide(slug);
  if (!g) notFound();

  const updated = new Date(g.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const searchHref = g.airport === "LTN" ? "/luton-airport-parking" : g.airport === "LHR" ? "/heathrow-airport-parking" : "/";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.summary || undefined,
    datePublished: g.published_at || g.updated_at,
    dateModified: g.updated_at,
    mainEntityOfPage: `${BASE}/guides/${g.slug}`,
    author: { "@type": "Organization", name: "AeroPark Direct", url: BASE },
    publisher: { "@type": "Organization", name: COMPANY.name, url: BASE },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="bg-white font-sans antialiased text-slate-900">
        <article className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All guides
          </Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">{g.title}</h1>
          <p className="mt-3 text-sm text-slate-500">
            {g.airport ? `${AIRPORT_LABEL[g.airport]} · ` : ""}Updated {updated} · {readingMinutes(g.body)} min read
          </p>
          {g.summary && <p className="mt-5 text-lg text-slate-700 leading-relaxed">{g.summary}</p>}

          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-slate-700">
            {renderGuideBody(g.body)}
          </div>

          <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold">Book your parking</h2>
            <p className="mt-1.5 text-slate-600">
              Compare checked, insured operators{g.airport ? ` at ${AIRPORT_LABEL[g.airport]}` : ""} and see the total price for your dates.
            </p>
            <Link href={searchHref} className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700">
              Check prices <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <p className="mt-4 text-sm text-slate-600">
              Questions? Call <a href={COMPANY.phoneHref} className="text-slate-900 underline underline-offset-4">{COMPANY.phoneDisplay}</a>.
            </p>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
