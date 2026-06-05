/**
 * Conservative HTML sanitizer for admin-authored rich text (company overview,
 * arrival/return instructions) that we render with dangerouslySetInnerHTML.
 *
 * Defense-in-depth: with RLS locked down, only admins can write these fields,
 * but we still strip anything executable so a compromised admin account or a
 * future data path can't inject stored XSS into every visitor's browser.
 *
 * Uses the browser's own parser (DOMParser) when available, which is far more
 * robust than regex. On the server it falls back to a regex strip so SSR output
 * is still safe; the client re-sanitizes on hydration.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "span", "div",
  "h1", "h2", "h3", "h4", "h5", "h6", "a", "small", "blockquote", "hr",
]);
const ALLOWED_ATTRS = new Set(["href", "title", "target", "rel"]);

function isSafeUrl(url: string): boolean {
  const v = url.trim().toLowerCase();
  // Block javascript:, data:, vbscript: and other script-y schemes.
  return !(/^(javascript|data|vbscript|file):/i.test(v));
}

function regexStrip(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|svg|math)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "") // inline event handlers
    .replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi, "");
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  // Server / no-DOM fallback.
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return regexStrip(html);
  }

  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild as HTMLElement | null;
    if (!root) return "";

    const walk = (node: Element) => {
      // Iterate over a static copy because we mutate as we go.
      for (const child of Array.from(node.children)) {
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          // Drop disallowed element but keep its (sanitized) text content.
          child.replaceWith(...Array.from(child.childNodes));
          continue;
        }
        // Strip every attribute except a tiny safe allowlist.
        for (const attr of Array.from(child.attributes)) {
          const name = attr.name.toLowerCase();
          if (!ALLOWED_ATTRS.has(name) || name.startsWith("on")) {
            child.removeAttribute(attr.name);
          } else if ((name === "href" || name === "src") && !isSafeUrl(attr.value)) {
            child.removeAttribute(attr.name);
          }
        }
        // Harden links opened in a new tab.
        if (tag === "a" && child.getAttribute("target") === "_blank") {
          child.setAttribute("rel", "noopener noreferrer");
        }
        walk(child);
      }
    };

    walk(root);
    return root.innerHTML;
  } catch {
    return regexStrip(html);
  }
}
