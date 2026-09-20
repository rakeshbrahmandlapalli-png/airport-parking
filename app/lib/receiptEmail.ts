// Booking confirmation / amendment email: layout only.
//
// Pure functions with no imports, so the template can be rendered and checked on
// its own (mail.ts sends it). Plain, flat, table-based HTML that survives Outlook,
// Gmail and Apple Mail: system fonts, solid colours, no gradients, shadows or
// emoji. A plain-text version is produced alongside for clients that want one.

export interface ReceiptHtmlParams {
  booking: any;
  company: any;
  isAmendment: boolean;
  terminalKey: string;
  displayAddress: string;
  displayPostcode: string;
  mapsLink: string;
  phone1: string;
  phone2: string;
  phone1Link: string;
  phone2Link: string;
  arrivalInstructions: string;
  returnInstructions: string;
  dropDate: string;
  pickDate: string;
  dropTime: string;
  pickTime: string;
  licencePlate: string;
  statusText: string;
  statusColor: string;
  statusBg: string;
  totalPaidStr: string;
  serviceType: string;
  flightNumber: string;
}

const SITE = "https://www.aeroparkdirect.co.uk";
const INK = "#0B1120";      // headings, buttons
const BODY = "#1F2937";     // running text
const MUTED = "#6B7280";    // labels, footer
const RULE = "#E5E7EB";     // hairlines
const PAPER = "#F3F4F6";    // page behind the card
const FONT = "Arial,Helvetica,sans-serif";

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Operator text was written for a web page and carries pictograms; an email that
// is also a receipt should not.
const PICTOGRAMS = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2139}\u{FE0F}\u{200D}]/gu;

/**
 * Operators write one paragraph per terminal ("<b>Terminal 4:</b> Follow signs ...").
 * A customer flying from Terminal 5 only needs Terminal 5. Only acts when the booked
 * terminal is known AND has its own paragraph, so nobody is ever left with nothing.
 */
function onlyMyTerminal(html: string, terminalKey?: string): string {
  const mine = String(terminalKey ?? "").match(/\d/)?.[0];
  if (!mine) return html;
  const parts = html.split(/(?:<br\s*\/?>\s*){2,}/i);
  const num = (part: string) => part.match(/^\s*<b>\s*Terminal\s*(\d)/i)?.[1];
  if (!parts.some((x) => num(x) === mine)) return html;
  return parts.filter((x) => { const n = num(x); return !n || n === mine; }).join("<br/><br/>");
}

/**
 * Operator instructions are trusted admin content, stored either as light HTML
 * (<b>, <br/>) or as plain text. Plain text is escaped and its line breaks kept.
 * A leading "VEHICLE DROP OFF PROCEDURE"-style heading is dropped because the
 * email already has its own section heading.
 */
export function formatInstructions(raw: unknown, terminalKey?: string): string {
  let s = String(raw ?? "").replace(PICTOGRAMS, "").trim();
  if (!/<\s*(br|b|p|ul|li|strong)\b/i.test(s)) s = esc(s).replace(/\r?\n/g, "<br/>");
  s = onlyMyTerminal(s, terminalKey);
  s = s.replace(/^\s*<b>([^<]{3,45})<\/b>\s*(?:<br\s*\/?>\s*)+/i, (m, h) => (/procedure|drop.?off|collection|departure|return/i.test(h) ? "" : m));
  return s.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br/><br/>").trim();
}

const htmlToText = (html: string): string =>
  html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

function feesNote(p: ReceiptHtmlParams): string {
  const isLuton = String(p.booking?.airport || "").toLowerCase().includes("luton");
  return String((isLuton ? p.company?.ltn_fees_note : p.company?.lhr_fees_note) ?? "").trim();
}

const heading = (t: string) =>
  `<p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">${esc(t)}</p>`;

const detailRow = (label: string, value: string, last = false) =>
  `<tr>
    <td valign="top" width="36%" style="padding:11px 12px 11px 0;${last ? "" : `border-bottom:1px solid ${RULE};`}font-family:${FONT};font-size:13px;color:${MUTED};">${esc(label)}</td>
    <td valign="top" style="padding:11px 0;${last ? "" : `border-bottom:1px solid ${RULE};`}font-family:${FONT};font-size:14px;font-weight:700;color:${INK};">${value}</td>
  </tr>`;

/** "07762569061" -> "07762 569061"; anything already spaced or non-UK is left alone. */
const fmtPhone = (n: string): string => (/^0\d{10}$/.test(n) ? `${n.slice(0, 5)} ${n.slice(5)}` : n);

const phoneLinks = (p: ReceiptHtmlParams): string => {
  const one = (label: string, link: string) => `<a href="tel:${esc(link)}" style="color:${INK};font-weight:700;text-decoration:underline;">${esc(fmtPhone(label))}</a>`;
  return [one(p.phone1, p.phone1Link), p.phone2 ? one(p.phone2, p.phone2Link) : ""].filter(Boolean).join("&nbsp;&nbsp;or&nbsp;&nbsp;");
};

// ── Shared shell, so every email we send looks like the same company ─────────

export const emailTokens = { INK, BODY, MUTED, RULE, PAPER, FONT, SITE };

/** A bordered box used for the "important, but not the main point" note. */
export function noteBox(label: string, text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${RULE};background-color:#F9FAFB;"><tr><td style="padding:14px 16px;">
  <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">${esc(label)}</p>
  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${BODY};">${esc(text)}</p>
</td></tr></table>`;
}

/** Label/value rows. Pass already-escaped values. */
export function detailTable(pairs: Array<[string, string]>): string {
  const rows = pairs.filter(([, v]) => v !== "" && v != null);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows
    .map(([k, v], i) => detailRow(k, v, i === rows.length - 1))
    .join("")}</table>`;
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${INK};border-radius:4px;"><a href="${esc(href)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

export function sectionHeading(t: string): string {
  return heading(t);
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:1.65;color:${BODY};">${html}</p>`;
}

/**
 * The frame every AeroPark email sits in: masthead, title, body, legal footer.
 * `internal` drops the customer-facing legal footer for admin/operator mail.
 */
export function emailShell(o: {
  title: string;
  kicker: string;
  heading: string;
  bodyHtml: string;
  preheader?: string;
  internal?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(o.title)}</title>
<style>@media only screen and (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.stack{display:block!important;width:100%!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(o.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#FFFFFF;border:1px solid ${RULE};">
<tr><td class="px" style="padding:24px 36px;border-bottom:3px solid ${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-family:${FONT};font-size:20px;font-weight:700;color:${INK};">AeroPark Direct</td>
    <td align="right" style="font-family:${FONT};font-size:12px;color:${MUTED};">${esc(o.kicker)}</td>
  </tr></table>
</td></tr>
<tr><td class="px" style="padding:28px 36px 0;">
  <h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${INK};">${esc(o.heading)}</h1>
</td></tr>
${o.bodyHtml}
<tr><td class="px" style="padding:32px 36px 28px;">
  <div style="border-top:1px solid ${RULE};padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
    ${o.internal
      ? "Sent automatically by the AeroPark Direct booking system."
      : "AeroPark Direct Ltd. Registered in England and Wales, company number 17211973. Registered office: 66 Paul Street, London EC2A 4NA."}
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Wrap content in the shell's standard left/right padding. */
export function emailSection(inner: string): string {
  return `<tr><td class="px" style="padding:0 36px 24px;">${inner}</td></tr>`;
}

export function renderReceiptHtml(p: ReceiptHtmlParams): string {
  const b = p.booking || {};
  const ref = esc(b.booking_ref);
  const first = esc(String(b.full_name || "").trim().split(/\s+/)[0]);
  const provider = esc(String(p.company?.name || "").trim() || "AeroPark Direct");
  const airport = esc(b.airport);
  const status = p.isAmendment ? "Booking updated" : "Booking confirmed";
  const fees = feesNote(p);
  const location = [p.displayAddress, p.displayPostcode].filter(Boolean).map(esc).join(", ");

  const lede = p.isAmendment
    ? `${first ? `Dear ${first}, your` : "Your"} booking has been updated. The details below replace any earlier confirmation.`
    : `${first ? `Dear ${first}, thank you` : "Thank you"} for booking with AeroPark Direct. Your ${esc(p.serviceType)} at ${airport} with ${provider} is confirmed. Please keep this email: you will need the reference and the contact numbers below on the day.`;

  const details = [
    detailRow("Service", `${esc(p.serviceType)}, ${provider}`),
    detailRow("Airport", airport),
    detailRow("Terminal", esc(p.terminalKey)),
    detailRow("Drop-off", `${esc(p.dropDate)} at ${esc(p.dropTime)}`),
    detailRow("Return", `${esc(p.pickDate)} at ${esc(p.pickTime)}`),
    detailRow("Vehicle registration", esc(p.licencePlate), !p.flightNumber && !b.full_name),
    ...(p.flightNumber ? [detailRow("Return flight", esc(p.flightNumber), !b.full_name)] : []),
    ...(b.full_name ? [detailRow("Lead passenger", esc(b.full_name), true)] : []),
  ].join("");

  const button = (href: string, label: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${INK};border-radius:4px;"><a href="${esc(href)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">${esc(label)}</a></td></tr></table>`;

  const section = (inner: string) => `<tr><td class="px" style="padding:28px 36px 0;">${inner}</td></tr>`;
  const rule = `<tr><td class="px" style="padding:28px 36px 0;"><div style="border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</div></td></tr>`;
  const bodyText = (html: string) => `<div style="font-family:${FONT};font-size:14px;line-height:1.65;color:${BODY};">${html}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${status} ${ref}</title>
<style>@media only screen and (max-width:620px){.px{padding-left:20px!important;padding-right:20px!important}.stack{display:block!important;width:100%!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${status}: ${ref}. Drop-off ${esc(p.dropDate)} at ${esc(p.dropTime)}. Arrival and return instructions are inside.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#FFFFFF;border:1px solid ${RULE};">

<tr><td class="px" style="padding:24px 36px;border-bottom:3px solid ${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-family:${FONT};font-size:20px;font-weight:700;color:${INK};">AeroPark Direct</td>
    <td align="right" style="font-family:${FONT};font-size:12px;color:${MUTED};">${p.isAmendment ? "Booking update" : "Booking confirmation"}</td>
  </tr></table>
</td></tr>

${section(`<h1 style="margin:0 0 12px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${INK};">${status}</h1>${bodyText(`<p style="margin:0;">${lede}</p>`)}`)}

${section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};"><tr>
  <td class="stack" valign="top" style="padding:16px 0;">
    <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;color:${MUTED};">Booking reference</p>
    <p style="margin:0;font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:1px;color:${INK};">${ref}</p>
  </td>
  <td class="stack" valign="top" align="right" style="padding:16px 0;">
    <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;color:${MUTED};">Total paid</p>
    <p style="margin:0;font-family:${FONT};font-size:22px;font-weight:700;color:${INK};">${esc(p.totalPaidStr)}</p>
  </td>
</tr></table>`)}

${section(`${heading("Your booking")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${details}</table>`)}

${rule}
${section(`${heading("Drop-off")}
<p style="margin:0 0 4px;font-family:${FONT};font-size:16px;font-weight:700;color:${INK};">${esc(p.dropDate)} at ${esc(p.dropTime)}</p>
${location ? `<p style="margin:0 0 12px;font-family:${FONT};font-size:14px;color:${BODY};">${location}</p>` : `<div style="height:8px;font-size:0;line-height:0;">&nbsp;</div>`}
${bodyText(formatInstructions(p.arrivalInstructions, p.terminalKey))}
<p style="margin:14px 0 18px;font-family:${FONT};font-size:14px;line-height:1.6;color:${BODY};">Contact number${p.phone2 ? "s" : ""}: ${phoneLinks(p)}</p>
${button(p.mapsLink, "Get directions")}`)}

${rule}
${section(`${heading("Return")}
<p style="margin:0 0 12px;font-family:${FONT};font-size:16px;font-weight:700;color:${INK};">${esc(p.pickDate)} at ${esc(p.pickTime)}</p>
${bodyText(formatInstructions(p.returnInstructions))}
<p style="margin:14px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${BODY};">Contact number${p.phone2 ? "s" : ""}: ${phoneLinks(p)}</p>`)}

${fees ? section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${RULE};background-color:#F9FAFB;"><tr><td style="padding:14px 16px;">
  <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">Not included in your booking price</p>
  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${BODY};">${esc(fees)}</p>
</td></tr></table>`) : ""}

${rule}
${section(`${heading("Changes and cancellations")}
${bodyText(`<p style="margin:0 0 14px;">You can view, change or cancel your booking online at any time. Free cancellation is available up to 24 hours before drop-off.</p>`)}
${button(`${SITE}/manage`, "Manage your booking")}`)}

${section(`${bodyText(`<p style="margin:0;">Questions about your booking? Reply to this email or write to <a href="mailto:info@aeroparkdirect.co.uk" style="color:${INK};font-weight:700;">info@aeroparkdirect.co.uk</a>.</p>`)}`)}

<tr><td class="px" style="padding:32px 36px 28px;">
  <div style="border-top:1px solid ${RULE};padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
    AeroPark Direct Ltd. Registered in England and Wales, company number 17211973. Registered office: 66 Paul Street, London EC2A 4NA.<br/>
    Your payment was processed securely by Stripe. We do not store your card details.
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text twin of the email, sent alongside the HTML. */
export function renderReceiptText(p: ReceiptHtmlParams): string {
  const b = p.booking || {};
  const first = String(b.full_name || "").trim().split(/\s+/)[0];
  const fees = feesNote(p);
  const location = [p.displayAddress, p.displayPostcode].filter(Boolean).join(", ");
  const phones = [p.phone1, p.phone2].filter(Boolean).map(fmtPhone).join(" or ");
  const provider = String(p.company?.name || "").trim() || "AeroPark Direct";
  const L: string[] = [
    p.isAmendment ? "BOOKING UPDATED" : "BOOKING CONFIRMED",
    "",
    p.isAmendment
      ? `${first ? `Dear ${first}, your` : "Your"} booking has been updated. These details replace any earlier confirmation.`
      : `${first ? `Dear ${first}, thank you` : "Thank you"} for booking with AeroPark Direct. Please keep this email: you will need the reference and contact numbers below on the day.`,
    "",
    `Booking reference: ${b.booking_ref}`,
    `Total paid: ${p.totalPaidStr}`,
    "",
    "YOUR BOOKING",
    `Service: ${p.serviceType}, ${provider}`,
    `Airport: ${b.airport}`,
    `Terminal: ${p.terminalKey}`,
    `Drop-off: ${p.dropDate} at ${p.dropTime}`,
    `Return: ${p.pickDate} at ${p.pickTime}`,
    `Vehicle registration: ${p.licencePlate}`,
    ...(p.flightNumber ? [`Return flight: ${p.flightNumber}`] : []),
    ...(b.full_name ? [`Lead passenger: ${b.full_name}`] : []),
    "",
    `DROP-OFF: ${p.dropDate} at ${p.dropTime}`,
    ...(location ? [location] : []),
    htmlToText(formatInstructions(p.arrivalInstructions, p.terminalKey)),
    `Contact: ${phones}`,
    `Directions: ${p.mapsLink}`,
    "",
    `RETURN: ${p.pickDate} at ${p.pickTime}`,
    htmlToText(formatInstructions(p.returnInstructions)),
    `Contact: ${phones}`,
    ...(fees ? ["", `NOT INCLUDED IN YOUR BOOKING PRICE: ${fees}`] : []),
    "",
    "CHANGES AND CANCELLATIONS",
    `View, change or cancel your booking: ${SITE}/manage`,
    "Free cancellation is available up to 24 hours before drop-off.",
    "",
    "Questions? Reply to this email or write to info@aeroparkdirect.co.uk.",
    "",
    "AeroPark Direct Ltd. Registered in England and Wales, company number 17211973. Registered office: 66 Paul Street, London EC2A 4NA.",
  ];
  return L.join("\n");
}
