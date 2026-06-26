// Light page-meta extractor for the OG card mode.
//
// Pulls just enough out of a URL's HTML to render a designed preview card
// without having to render the page itself in a headless browser. Tolerant to
// 4xx/5xx, network failures, and weird/empty HTML — caller should check the
// `ok` flag and fall back to puppeteer screenshot when needed.

export type PageMeta =
  | {
      ok: true;
      title: string;
      description: string | null;
      favicon: string | null;
      // Best-effort *real* brand logo (apple-touch-icon / manifest icon), distinct
      // from `favicon` which is often a generic low-res .ico. May be null.
      logo: string | null;
      ogImage: string | null;
      host: string;
    }
  | { ok: false; reason: string };

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 256 * 1024; // 256 KB is plenty for <head>; truncate the rest

// Minimal HTML-entity decoder for the handful that show up in titles/descriptions.
// (Browsers do this automatically; Satori does not — we feed it raw strings.)
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–",
  mdash: "—", hellip: "…", laquo: "«", raquo: "»", copy: "©", reg: "®", trade: "™",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return _; }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return _; }
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

function absolutize(maybeRelative: string | null, base: URL): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function pickMeta(html: string, selectors: { name?: string; property?: string }[]): string | null {
  for (const sel of selectors) {
    const attr = sel.property ? "property" : "name";
    const key = sel.property ?? sel.name ?? "";
    // <meta property="og:title" content="..."> or with quotes flipped / extra whitespace
    const re = new RegExp(
      `<meta\\s+[^>]*${attr}\\s*=\\s*[\"']${key}[\"'][^>]*content\\s*=\\s*[\"']([^\"']+)[\"']`,
      "i",
    );
    const m = html.match(re);
    if (m && m[1]) return m[1].trim();
    // also try the reversed attribute order (content first, then name/property)
    const re2 = new RegExp(
      `<meta\\s+[^>]*content\\s*=\\s*[\"']([^\"']+)[\"'][^>]*${attr}\\s*=\\s*[\"']${key}[\"']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2 && m2[1]) return m2[1].trim();
  }
  return null;
}

function pickFavicon(html: string, base: URL): string | null {
  // Try a few <link rel="..."> variants in priority order
  const relPatterns = [
    "apple-touch-icon",
    "icon",
    "shortcut icon",
  ];
  for (const rel of relPatterns) {
    const re = new RegExp(
      `<link\\s+[^>]*rel\\s*=\\s*[\"']${rel}[\"'][^>]*href\\s*=\\s*[\"']([^\"']+)[\"']`,
      "i",
    );
    const m = html.match(re);
    if (m && m[1]) return absolutize(m[1], base);
    const re2 = new RegExp(
      `<link\\s+[^>]*href\\s*=\\s*[\"']([^\"']+)[\"'][^>]*rel\\s*=\\s*[\"']${rel}[\"']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2 && m2[1]) return absolutize(m2[1], base);
  }
  // Last resort: /favicon.ico
  return absolutize("/favicon.ico", base);
}

function pickAppleTouchIcon(html: string, base: URL): string | null {
  for (const rel of ["apple-touch-icon-precomposed", "apple-touch-icon"]) {
    const re = new RegExp(`<link\\s+[^>]*rel\\s*=\\s*["']${rel}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, "i");
    const m = html.match(re);
    if (m && m[1]) return absolutize(m[1], base);
    const re2 = new RegExp(`<link\\s+[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*rel\\s*=\\s*["']${rel}["']`, "i");
    const m2 = html.match(re2);
    if (m2 && m2[1]) return absolutize(m2[1], base);
  }
  return null;
}

// Resolve the *real* brand logo, preferring a proper square icon over the
// often-generic favicon.ico: apple-touch-icon → largest web-manifest icon.
// Returns null when neither exists (caller falls back to og:image / monogram).
async function resolveLogo(html: string, base: URL): Promise<string | null> {
  const apple = pickAppleTouchIcon(html, base);
  if (apple) return apple;

  // Web app manifest: parse it and take the largest icon.
  const manMatch =
    html.match(/<link\s+[^>]*rel\s*=\s*["']manifest["'][^>]*href\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']manifest["']/i);
  if (!manMatch || !manMatch[1]) return null;
  const manUrl = absolutize(manMatch[1], base);
  if (!manUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(manUrl, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) return null;
    const json = (await res.json()) as { icons?: { src?: string; sizes?: string }[] };
    const icons = Array.isArray(json.icons) ? json.icons : [];
    let best: string | null = null;
    let bestPx = -1;
    for (const ic of icons) {
      if (!ic.src) continue;
      const px = ic.sizes ? parseInt(String(ic.sizes).split("x")[0], 10) || 0 : 0;
      if (px >= bestPx) { bestPx = px; best = ic.src; }
    }
    return best ? absolutize(best, new URL(manUrl)) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickTitle(html: string): string | null {
  const og = pickMeta(html, [{ property: "og:title" }, { name: "twitter:title" }]);
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function pickDescription(html: string): string | null {
  return pickMeta(html, [
    { property: "og:description" },
    { name: "twitter:description" },
    { name: "description" },
  ]);
}

export async function fetchPageMeta(targetUrl: string): Promise<PageMeta> {
  const normalized = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
  let base: URL;
  try {
    base = new URL(normalized);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(base.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A real-looking UA: many sites return blank/blocked HTML to default fetch.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 OGzap/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: `fetch_failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  clearTimeout(timer);

  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  // Read at most MAX_HTML_BYTES — <head> is always at the start
  let html = "";
  try {
    const reader = res.body?.getReader();
    if (!reader) {
      html = await res.text();
    } else {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let total = 0;
      while (total < MAX_HTML_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (html.includes("</head>")) break; // got the head, stop
      }
      try { await reader.cancel(); } catch { /* noop */ }
    }
  } catch (err) {
    return { ok: false, reason: `read_failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  const titleRaw = pickTitle(html);
  if (!titleRaw) return { ok: false, reason: "no_title" };
  const descriptionRaw = pickDescription(html);

  return {
    ok: true,
    title: decodeEntities(titleRaw),
    description: descriptionRaw ? decodeEntities(descriptionRaw) : null,
    favicon: pickFavicon(html, base),
    logo: await resolveLogo(html, base),
    ogImage: absolutize(pickMeta(html, [{ property: "og:image" }, { name: "twitter:image" }]), base),
    host: base.hostname.replace(/^www\./, ""),
  };
}
