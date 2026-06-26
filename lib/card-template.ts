// Designed OG card template for the "card" mode.
//
// Returns a self-contained HTML document rendered to a 1200x630 PNG by headless
// Chromium. Everything is real, pulled from the target page: the headline, the
// brand logo, the brand color (the site's own theme-color), the brand font (the
// site's actual webfont when loadable), and — for content pages — the page's
// own og:image used as a hero. Nothing is invented or AI-generated.

export type CardData = {
  host: string;
  section: string | null;     // first path segment → eyebrow ("blog" → "BLOG")
  siteName: string;           // wordmark, e.g. "Creatdrop"
  title: string;              // distilled headline (already cleaned)
  accent: string;             // real brand color (validated CSS color)
  fontFamily: string | null;  // the page's real font-family stack, or null → default
  fontCssLink: string | null; // a stylesheet URL to <link> (e.g. Google Fonts) for that font
  fontFaceCss: string | null; // raw @font-face block to inject (self-hosted brand font)
  logoDataUrl: string | null; // brand logo as data URL (avoids canvas taint)
  heroDataUrl: string | null; // og:image content image used as a hero panel
  isPro: boolean;
};

const FALLBACK_ACCENT = "#7c3aed";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Clean a raw <title>/og:title into a short headline: drop a trailing
// " | Brand" / " — Brand" tail, collapse whitespace, cap length.
export function distillHeadline(raw: string, host: string): string {
  let h = (raw || "").trim().replace(/\s+/g, " ");
  // Strip a leading "Brand | " / "Brand — " prefix (the brand is already shown
  // as the wordmark), when the rest is a substantial headline.
  const lead = h.match(/^[^|–—]{1,28}\s*[|–—]\s*(.{16,})$/);
  if (lead) h = lead[1].trim();
  // Strip a trailing " | Brand" / " — Brand" tail.
  const tail = h.match(/^(.{16,}?)\s*[|–—]\s*[^|–—]{1,40}$/);
  if (tail) h = tail[1].trim();
  if (h.length > 120) h = h.slice(0, 117).trimEnd() + "…";
  return h || host;
}

// Headline size shrinks as the text gets longer so it always fits. The `hero`
// layout has a narrower text column, so it needs smaller steps.
function headlineSize(len: number, hero: boolean): number {
  if (hero) {
    if (len <= 38) return 70;
    if (len <= 62) return 58;
    if (len <= 92) return 48;
    return 42;
  }
  if (len <= 38) return 90;
  if (len <= 62) return 74;
  if (len <= 92) return 62;
  return 54;
}

export function buildCardHtml(data: CardData): string {
  const headline = escapeHtml(data.title);
  const siteName = escapeHtml(data.siteName);
  const domain = escapeHtml(data.section ? `${data.host}/${data.section}` : data.host);
  const eyebrow = data.section ? escapeHtml(data.section.replace(/[-_]/g, " ")) : "";
  const accent = data.accent || FALLBACK_ACCENT;
  const hero = !!data.heroDataUrl;
  const hSize = headlineSize(data.title.length, hero);

  const logoTag = data.logoDataUrl
    ? `<img class="logo" src="${data.logoDataUrl}" alt="">`
    : "";
  const watermark = data.isPro ? "" : `<div class="wm">Made with OGzap</div>`;

  // Font: prefer the page's real font (linked stylesheet or injected @font-face);
  // always fall back to Sora so the card never renders in a broken/blank face.
  const fontStack = data.fontFamily ? `${data.fontFamily}, 'Sora', system-ui, sans-serif` : `'Sora', system-ui, sans-serif`;
  const fontLink = data.fontCssLink ? `<link rel="stylesheet" href="${data.fontCssLink}">` : "";
  const fontFace = data.fontFaceCss || "";

  const heroPanel = hero
    ? `<div class="hero"><img src="${data.heroDataUrl}" alt=""></div>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
${fontLink}
<style>
  ${fontFace}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:1200px;height:630px;}
  :root{--accent:${accent};}
  .card{position:relative;width:1200px;height:630px;overflow:hidden;display:flex;
    background:
      radial-gradient(900px 600px at 88% 110%, color-mix(in srgb, var(--accent) 42%, transparent) 0%, transparent 60%),
      radial-gradient(700px 500px at 6% -12%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 55%),
      linear-gradient(135deg,#0d0b18 0%,#121022 55%,#0b0915 100%);
    font-family:${fontStack};}
  .grid{position:absolute;inset:0;background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px);
    background-size:46px 46px;mask-image:radial-gradient(1000px 620px at 26% 38%,#000 0%,transparent 80%);}
  .col{position:relative;z-index:2;display:flex;flex-direction:column;padding:70px 80px;
    width:${hero ? "660px" : "100%"};flex:none;}
  .top{display:flex;align-items:center;justify-content:space-between;}
  .brand{display:flex;align-items:center;gap:20px;}
  .logo{width:84px;height:84px;border-radius:19px;object-fit:cover;background:rgba(255,255,255,0.08);flex:none;}
  .wordmark{color:#fff;font-weight:700;font-size:42px;letter-spacing:-0.015em;}
  .domain{color:rgba(255,255,255,0.55);font-family:'JetBrains Mono',monospace;font-size:23px;}
  .mid{margin-top:auto;}
  .eyebrow{color:color-mix(in srgb, var(--accent) 62%, #fff 38%);font-weight:700;font-size:25px;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:26px;}
  .headline{color:#fff;font-weight:800;font-size:${hSize}px;line-height:1.06;letter-spacing:-0.022em;}
  .bar{margin-top:36px;width:100px;height:8px;border-radius:5px;background:var(--accent);}
  .hero{position:relative;z-index:1;flex:1;overflow:hidden;}
  .hero img{width:100%;height:100%;object-fit:cover;}
  .hero::before{content:"";position:absolute;inset:0;z-index:1;
    background:linear-gradient(90deg,#0d0b18 0%,rgba(13,11,24,0.35) 22%,transparent 50%);}
  .wm{position:absolute;bottom:26px;right:40px;z-index:3;font-size:18px;color:rgba(255,255,255,0.92);
    font-family:'JetBrains Mono',monospace;background:rgba(10,8,20,0.5);padding:6px 13px;
    border-radius:9px;box-shadow:0 2px 12px rgba(0,0,0,0.35);}
</style></head>
<body><div class="card">
  <div class="grid"></div>
  <div class="col">
    <div class="top">
      <div class="brand">${logoTag}<span class="wordmark">${siteName}</span></div>
      ${hero ? "" : `<span class="domain">${domain}</span>`}
    </div>
    <div class="mid">
      ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}
      <div class="headline">${headline}</div>
      <div class="bar"></div>
      ${hero ? `<div class="domain" style="margin-top:24px">${domain}</div>` : ""}
    </div>
  </div>
  ${heroPanel}
  ${watermark}
</div></body></html>`;
}
