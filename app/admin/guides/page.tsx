"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import { recordAdminAction } from "@/app/lib/audit-client";
import { AIRPORT_LABEL, renderGuideBody, slugify, type Guide } from "@/app/lib/guides";

// Write and publish help articles for the public site (/guides). Saving goes
// through /api/admin/guides, which refreshes the public pages immediately.

type Draft = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  airport: "" | "LTN" | "LHR";
  status: "draft" | "published";
};

const EMPTY: Draft = { title: "", slug: "", summary: "", body: "", airport: "", status: "draft" };

const fieldCls = "w-full bg-canvas border border-fg/10 hover:border-fg/20 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none focus:ring-2 focus:ring-blue-500/40 [-webkit-text-fill-color:rgb(var(--admin-fg))] placeholder:text-fg-4";
const labelCls = "block text-sm font-medium text-fg-2 mb-1.5";

const HELP = [
  ["## Heading", "a section heading"],
  ["- item", "a bullet point (one per line)"],
  ["1. item", "a numbered step"],
  ["**bold**", "bold words"],
  ["[text](/heathrow-meet-and-greet)", "a link"],
];

export default function GuidesAdmin() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/admin/guides");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load guides.");
      setGuides(data.guides);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/guides")
      .then(async (res) => {
        const data = await res.json();
        if (!alive) return;
        if (res.ok) setGuides(data.guides);
        else setError(data.error || "Could not load guides.");
      })
      .catch(() => alive && setError("Could not load guides."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const open = (g?: Guide) => {
    setDraft(g ? { id: g.id, title: g.title, slug: g.slug, summary: g.summary, body: g.body, airport: g.airport || "", status: g.status } : { ...EMPTY });
    setSlugTouched(!!g);
    setPreview(false);
    setNotice("");
    setError("");
  };

  const save = async (status: "draft" | "published") => {
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, airport: draft.airport || null, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the guide.");
      const saved: Guide = data.guide;
      recordAdminAction({
        actionType: !draft.id ? "guide.create" : draft.status !== status ? (status === "published" ? "guide.publish" : "guide.unpublish") : "guide.update",
        entityType: "guide",
        entityId: saved.id,
        metadata: { label: `Guide: ${saved.title}`, after: status },
      });
      setDraft({ id: saved.id, title: saved.title, slug: saved.slug, summary: saved.summary, body: saved.body, airport: saved.airport || "", status: saved.status });
      setSlugTouched(true);
      setNotice(status === "published" ? "Published. It's live on the website now." : "Saved as a draft. Only staff can see it.");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !confirm(`Delete "${draft.title}"? This can't be undone.`)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/guides?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) { setError("Could not delete the guide."); return; }
    recordAdminAction({ actionType: "guide.delete", entityType: "guide", entityId: draft.id, metadata: { label: `Guide: ${draft.title}`, after: "deleted" } });
    setDraft(null);
    load();
  };

  const words = draft ? draft.body.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg antialiased">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto h-screen pb-32 md:pb-10 custom-scrollbar">
        <div className="max-w-3xl">
          {!draft ? (
            <>
              <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-fg">Guides</h1>
                  <p className="mt-1 text-sm text-fg-3">Help articles on the website at aeroparkdirect.co.uk/guides. One real question answered well beats ten general ones.</p>
                </div>
                <button type="button" onClick={() => open()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 shrink-0">
                  <Plus className="w-4 h-4" aria-hidden="true" /> New guide
                </button>
              </div>

              {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

              <div className="rounded-xl border border-fg/[0.08] bg-panel divide-y divide-fg/[0.06]">
                {loading ? (
                  <p className="px-5 py-10 text-center text-sm text-fg-3 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…</p>
                ) : guides.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-fg-2">No guides yet.</p>
                    <p className="mt-1 text-sm text-fg-4">Ideas: “Heathrow T5: where to meet your driver”, “What if my flight is delayed?”, “Luton drop-off charges explained”.</p>
                  </div>
                ) : guides.map((g) => (
                  <button key={g.id} type="button" onClick={() => open(g)} className="w-full text-left px-5 py-4 hover:bg-fg/[0.03] flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{g.title}</p>
                      <p className="mt-0.5 text-xs text-fg-4 truncate">
                        {g.airport ? `${AIRPORT_LABEL[g.airport]} · ` : ""}/guides/{g.slug} · updated {new Date(g.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${g.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-fg/[0.06] text-fg-3"}`}>
                      {g.status === "published" ? "Live" : "Draft"}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <button type="button" onClick={() => { setDraft(null); setError(""); }} className="inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All guides
                </button>
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${draft.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-fg/[0.06] text-fg-3"}`}>
                    {draft.status === "published" ? "Live" : "Draft"}
                  </span>
                  {draft.status === "published" && (
                    <a href={`/guides/${draft.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline underline-offset-4">
                      View <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-fg/[0.08] bg-panel p-5 md:p-6 space-y-5">
                <div>
                  <label htmlFor="g-title" className={labelCls}>Title</label>
                  <input id="g-title" value={draft.title} maxLength={120} placeholder="e.g. Heathrow Terminal 5 meet and greet: where to go"
                    onChange={(e) => setDraft({ ...draft, title: e.target.value, slug: slugTouched ? draft.slug : slugify(e.target.value) })}
                    className={fieldCls} />
                  <p className="mt-1 text-xs text-fg-4">Write it the way a customer would search for it.</p>
                </div>

                <div className="grid sm:grid-cols-[1fr_12rem] gap-4">
                  <div>
                    <label htmlFor="g-slug" className={labelCls}>Web address</label>
                    <div className="flex items-center rounded-lg border border-fg/10 bg-canvas focus-within:ring-2 focus-within:ring-blue-500/40">
                      <span className="pl-3.5 text-sm text-fg-4 whitespace-nowrap">/guides/</span>
                      <input id="g-slug" value={draft.slug} maxLength={90}
                        onChange={(e) => { setSlugTouched(true); setDraft({ ...draft, slug: slugify(e.target.value) || e.target.value.toLowerCase() }); }}
                        className="w-full bg-transparent px-1 py-2.5 text-base md:text-sm text-fg outline-none [-webkit-text-fill-color:rgb(var(--admin-fg))]" />
                    </div>
                    {draft.status === "published" && <p className="mt-1 text-xs text-amber-400">Changing this breaks links people have already shared.</p>}
                  </div>
                  <div>
                    <label htmlFor="g-airport" className={labelCls}>Airport</label>
                    <select id="g-airport" value={draft.airport} onChange={(e) => setDraft({ ...draft, airport: e.target.value as Draft["airport"] })} className={fieldCls}>
                      <option value="">Both / general</option>
                      <option value="LTN">Luton</option>
                      <option value="LHR">Heathrow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="g-summary" className={labelCls}>Summary</label>
                  <textarea id="g-summary" value={draft.summary} maxLength={300} rows={2}
                    placeholder="One or two sentences. Shown in Google results and at the top of the guide."
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })} className={`${fieldCls} resize-y`} />
                  <p className={`mt-1 text-xs ${draft.summary.length > 160 ? "text-amber-400" : "text-fg-4"}`}>
                    {draft.summary.length} characters{draft.summary.length > 160 ? ". Google usually shows about 155, so the end may be cut off." : ". Aim for 120–155."}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="g-body" className="text-sm font-medium text-fg-2">Guide</label>
                    <div role="group" aria-label="Editor view" className="flex items-center bg-fg/[0.05] rounded-lg p-0.5">
                      {[["Write", false], ["Preview", true]].map(([label, val]) => (
                        <button key={String(label)} type="button" onClick={() => setPreview(val as boolean)} aria-pressed={preview === val}
                          className={`px-3 py-1 rounded-md text-sm ${preview === val ? "bg-panel text-fg font-medium shadow-sm ring-1 ring-fg/10" : "text-fg-3 hover:text-fg"}`}>
                          {label === "Preview" && <Eye className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden="true" />}{label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {preview ? (
                    <div className="rounded-lg border border-fg/10 bg-white px-5 py-5 min-h-[20rem] space-y-4 text-[15px] leading-relaxed text-slate-700">
                      {draft.title && <h1 className="text-2xl font-semibold text-slate-900">{draft.title}</h1>}
                      {draft.summary && <p className="text-lg text-slate-700">{draft.summary}</p>}
                      {draft.body.trim() ? renderGuideBody(draft.body) : <p className="text-slate-400">Nothing written yet.</p>}
                    </div>
                  ) : (
                    <textarea id="g-body" value={draft.body} rows={18}
                      placeholder={"Answer the question in the first paragraph.\n\n## Where to go\n- Drive to …\n- Look for …\n\n## What it costs\n…"}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      className={`${fieldCls} font-mono text-sm leading-relaxed resize-y min-h-[20rem]`} />
                  )}
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs text-fg-4">{words} words{words < 300 ? ". Aim for 300 to 800." : ""}</p>
                    <details className="text-xs text-fg-3">
                      <summary className="cursor-pointer select-none">Formatting help</summary>
                      <ul className="mt-2 space-y-1">
                        {HELP.map(([code, what]) => (
                          <li key={code}><code className="font-mono text-fg-2">{code}</code> {what}</li>
                        ))}
                        <li>Leave a blank line between paragraphs.</li>
                      </ul>
                    </details>
                  </div>
                </div>

                {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
                {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-fg/[0.08]">
                  <div>
                    {draft.id && (
                      <button type="button" onClick={remove} disabled={saving} className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:underline underline-offset-4">
                        <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2">
                    {draft.status === "published" ? (
                      <button type="button" disabled={saving} onClick={() => save("draft")} className="px-4 py-2.5 rounded-lg border border-fg/10 bg-fg/[0.04] hover:bg-fg/[0.08] text-sm font-medium text-fg-2">
                        Unpublish
                      </button>
                    ) : (
                      <button type="button" disabled={saving} onClick={() => save("draft")} className="px-4 py-2.5 rounded-lg border border-fg/10 bg-fg/[0.04] hover:bg-fg/[0.08] text-sm font-medium text-fg-2">
                        Save draft
                      </button>
                    )}
                    <button type="button" disabled={saving} onClick={() => save("published")} className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Pencil className="w-4 h-4" aria-hidden="true" />}
                      {draft.status === "published" ? "Update" : "Publish"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <AdminMobileNav action={draft ? undefined : { label: "New guide", Icon: Plus, onClick: () => open() }} />
    </div>
  );
}
