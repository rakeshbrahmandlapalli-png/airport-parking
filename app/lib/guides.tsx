import Link from "next/link";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Guides: short help articles the team writes in admin (/admin/guides) and the
// site publishes at /guides/<slug>. Stored in the Supabase `guides` table
// (public can read published rows only; writes go through /api/admin/guides).
//
// The body is plain text with a few simple marks, so staff don't need HTML:
//   ## Heading            a section heading
//   - item                a bullet list (consecutive lines)
//   1. item               a numbered list
//   **bold**              bold text
//   [text](/page or https://…)   a link
// Anything else is a paragraph; a blank line starts a new one. Rendered to
// React elements (never raw HTML), so nothing typed can inject markup.
// ─────────────────────────────────────────────────────────────────────────────

export type Guide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  airport: "LTN" | "LHR" | null;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

export const AIRPORT_LABEL: Record<"LTN" | "LHR", string> = { LTN: "Luton", LHR: "Heathrow" };

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Links: site paths ("/…") or http(s) URLs only.
function safeHref(href: string): string | null {
  const h = href.trim();
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  return null;
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={`${key}-b${i++}`} className="font-semibold text-slate-900">{m[1]}</strong>);
    } else {
      const href = safeHref(m[3]);
      if (!href) out.push(m[2]);
      else if (href.startsWith("/")) out.push(<Link key={`${key}-l${i++}`} href={href} className="text-blue-700 underline underline-offset-4">{m[2]}</Link>);
      else out.push(<a key={`${key}-l${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline underline-offset-4">{m[2]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderGuideBody(body: string): ReactNode[] {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      const k = `p${blocks.length}`;
      blocks.push(<p key={k}>{inline(para.join(" "), k)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l${blocks.length}`;
      const items = list.items.map((it, i) => <li key={`${k}-${i}`}>{inline(it, `${k}-${i}`)}</li>);
      blocks.push(list.ordered
        ? <ol key={k} className="list-decimal pl-6 space-y-1.5">{items}</ol>
        : <ul key={k} className="list-disc pl-6 space-y-1.5">{items}</ul>);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = /^#{2,3}\s+(.+)$/.exec(line);
    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (heading) {
      flushPara(); flushList();
      const k = `h${blocks.length}`;
      blocks.push(<h2 key={k} className="pt-4 text-xl md:text-2xl font-semibold tracking-tight text-slate-900">{inline(heading[1], k)}</h2>);
      continue;
    }
    if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}
