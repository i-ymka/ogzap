import { ImageResponse } from "next/og";
import { neon } from "@neondatabase/serverless";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { buildCardHtml, distillHeadline } from "@/lib/card-template";

export const runtime = "nodejs";
export const maxDuration = 60;

// Capture a real 1200x630 screenshot in-process via headless Chromium.
// Runs inside this Vercel app — no external screenshot service to depend on.
async function captureScreenshot(targetUrl: string): Promise<Buffer | null> {
  let browser = null;
  try {
    const normalized = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1200, height: 630 },
    });
    const page = await browser.newPage();
    await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500)); // brief settle for fonts/hero art
    return (await page.screenshot({ type: "png" })) as Buffer;
  } catch {
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

function isValidColor(c: string | null): boolean {
  if (!c) return false;
  const v = c.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^rgba?\(/i.test(v) || /^hsla?\(/i.test(v);
}

type BrandExtract = {
  themeColor: string | null;
  fontFamily: string | null;
  googleFontHref: string | null;
  fontFaceCss: string | null;
  ogImage: string | null;
  appleIcon: string | null;
  title: string | null;
  description: string | null;
  host: string;
};

// Runs IN the target page (via page.evaluate): reads the site's real brand
// signals — declared theme-color, the actual heading font + its webfont source,
// og:image and apple-touch-icon — so the card uses the brand's own color/font
// instead of guessing.
function extractBrand(): BrandExtract {
  // Every field is read defensively: a throw anywhere must NOT abort the whole
  // extraction (that would drop the page to a screenshot). Worst case we return
  // partial data (even just the host) and still render a branded card.
  const tc = (f: () => string | null): string | null => { try { return f(); } catch { return null; } };
  const metaC = (sel: string): string | null => {
    try { const e = document.querySelector(sel); return e ? e.getAttribute("content") : null; } catch { return null; }
  };
  const abs = (u: string | null): string | null => {
    if (!u) return null;
    try { return new URL(u, location.href).href; } catch { return null; }
  };

  const fontFamily = tc(() => {
    const h = document.querySelector("h1") || document.querySelector("h2") || document.body;
    return h ? getComputedStyle(h).fontFamily : null;
  });

  const googleFontHref = tc(() => {
    for (const l of Array.from(document.querySelectorAll('link[rel="stylesheet"]'))) {
      const href = (l as HTMLLinkElement).href || "";
      if (/fonts\.googleapis\.com\/css/.test(href)) return href;
    }
    return null;
  });

  const fontFaceCss = tc(() => {
    const primary = (fontFamily || "").split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
    const blocks: string[] = [];
    for (const ss of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try { rules = (ss as CSSStyleSheet).cssRules; } catch { continue; }
      if (!rules) continue;
      for (const r of Array.from(rules)) {
        if (r.type !== 5) continue; // CSSFontFaceRule
        const fr = r as CSSFontFaceRule;
        const fam = (fr.style.getPropertyValue("font-family") || "").replace(/['"]/g, "").trim();
        if (primary && fam.toLowerCase() !== primary) continue;
        let src = fr.style.getPropertyValue("src") || "";
        src = src.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, _q, u) => `url("${abs(u)}")`);
        if (!src) continue;
        const wght = fr.style.getPropertyValue("font-weight") || "normal";
        const sty = fr.style.getPropertyValue("font-style") || "normal";
        blocks.push(`@font-face{font-family:"${fam}";src:${src};font-weight:${wght};font-style:${sty};font-display:swap;}`);
        if (blocks.length >= 4) break;
      }
      if (blocks.length >= 4) break;
    }
    return blocks.length ? blocks.join("\n") : null;
  });

  const appleIcon = tc(() => {
    const a = document.querySelector('link[rel~="apple-touch-icon"]') ||
      document.querySelector('link[rel="apple-touch-icon-precomposed"]');
    return a ? abs(a.getAttribute("href")) : null;
  });

  let host = "";
  try { host = location.host.replace(/^www\./, ""); } catch { host = ""; }

  return {
    themeColor: metaC('meta[name="theme-color"]'),
    fontFamily,
    googleFontHref,
    fontFaceCss,
    ogImage: abs(metaC('meta[property="og:image"]') || metaC('meta[name="twitter:image"]')),
    appleIcon,
    title: metaC('meta[property="og:title"]') || tc(() => document.title || null),
    description: metaC('meta[property="og:description"]') || metaC('meta[name="description"]'),
    host,
  };
}

// Load the real page in Chromium, pull its brand signals, then render the
// designed card — all in one browser launch. Designed to (almost) always
// produce a card: a slow/blocked/partial page still yields a clean branded
// card from whatever we could read (down to just the host), which beats a
// screenshot of an error page. Returns null only if the card render itself
// fails — the caller then falls back to a screenshot.
async function renderBrandedCard(targetUrl: string, isPro: boolean): Promise<Buffer | null> {
  const normalized = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
  let urlHost = "";
  try { urlHost = new URL(normalized).hostname.replace(/^www\./, ""); } catch { /* ignore */ }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();
    // A real Chrome UA: many sites serve blank/blocked HTML to headless UAs.
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    // We only need the DOM + CSS for brand signals — skip images/media/fonts so
    // heavy SPAs load fast and don't time out.
    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const t = req.resourceType();
        if (t === "image" || t === "media" || t === "font") req.abort().catch(() => {});
        else req.continue().catch(() => {});
      });
    } catch { /* interception unsupported — proceed without it */ }

    let data: BrandExtract | null = null;
    try {
      await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 18000 });
    } catch { /* timeout/partial nav — still try to read whatever rendered */ }
    try {
      await new Promise((r) => setTimeout(r, 400));
      data = (await page.evaluate(extractBrand)) as BrandExtract;
    } catch { data = null; }

    // Always build a card. Fill gaps from the host rather than bailing out.
    const safeHost = (data && data.host) || urlHost || normalized;
    // Anti-bot interstitials (Cloudflare etc.) serve a challenge page to
    // headless browsers — never use its title as the headline; fall back to the
    // bare domain so the card stays clean instead of saying "Just a moment…".
    const CHALLENGE_RE =
      /just a moment|attention required|please wait|verif(y|ying)|checking your browser|one moment|access denied|are you (a )?(human|robot)|enable javascript|forbidden|temporarily unavailable/i;
    let titleRaw = (data && data.title) || safeHost;
    if (CHALLENGE_RE.test(titleRaw)) titleRaw = safeHost;
    const accent = data && isValidColor(data.themeColor) ? (data.themeColor as string).trim() : DEFAULT_PRIMARY;

    // Logo vs hero: prefer a real apple-touch-icon as the logo; then og:image is
    // a content hero. With no apple icon, use og:image itself as the logo.
    let logoSrc: string | null = null;
    let heroSrc: string | null = null;
    if (data) {
      if (data.appleIcon) {
        logoSrc = data.appleIcon;
        heroSrc = data.ogImage && data.ogImage !== data.appleIcon ? data.ogImage : null;
      } else {
        logoSrc = data.ogImage;
      }
    }

    const [logoDataUrl, heroDataUrl] = await Promise.all([
      fetchImageDataUrl(logoSrc),
      fetchImageDataUrl(heroSrc),
    ]);

    let section: string | null = null;
    try {
      const seg = new URL(normalized).pathname.split("/").filter(Boolean)[0];
      if (seg && seg.length <= 24) section = seg;
    } catch { /* ignore */ }

    const html = buildCardHtml({
      host: safeHost,
      section,
      siteName: siteNameFromHost(safeHost),
      title: distillHeadline(titleRaw, safeHost),
      accent,
      fontFamily: data ? data.fontFamily : null,
      fontCssLink: data ? data.googleFontHref : null,
      fontFaceCss: data ? data.fontFaceCss : null,
      logoDataUrl,
      heroDataUrl,
      isPro,
    });

    const cardPage = await browser.newPage();
    await cardPage.setViewport({ width: 1200, height: 630 });
    await cardPage.setContent(html, { waitUntil: "load", timeout: 20000 });
    try { await cardPage.evaluate("document.fonts ? document.fonts.ready : null"); } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 250));
    return (await cardPage.screenshot({ type: "png" })) as Buffer;
  } catch {
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

// Fetch an image and return it as a data: URL so the card's canvas color
// extraction isn't CORS-tainted. Returns null on any failure.
async function fetchImageDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 3 * 1024 * 1024) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// "creatdrop.com" → "Creatdrop"; "docs.acme.dev" → "Acme".
function siteNameFromHost(host: string): string {
  const labels = host.replace(/^www\./, "").split(".");
  const brand = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

const DEFAULT_PRIMARY = "#7c3aed";

const CACHE_HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
  "Vercel-CDN-Cache-Control": "public, max-age=31536000, stale-while-revalidate=86400",
};

const FREE_RENDER_LIMIT = 100;

type OgCustomerRow = {
  plan: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  imagesServed: number;
};

async function fetchCustomer(customerKey: string): Promise<OgCustomerRow | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const sql = neon(url);
    const rows = await sql`
      SELECT plan, "logoUrl", "primaryColor", "secondaryColor", "fontFamily", "imagesServed"
      FROM "OgCustomer"
      WHERE "customerKey" = ${customerKey}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return rows[0] as OgCustomerRow;
  } catch {
    return null;
  }
}

function isOverLimit(customer: OgCustomerRow | null): boolean {
  if (!customer) return false;
  return customer.plan === "FREE" && customer.imagesServed >= FREE_RENDER_LIMIT;
}

async function incrementImagesServed(customerKey: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  try {
    const sql = neon(url);
    await sql`
      UPDATE "OgCustomer"
      SET "imagesServed" = "imagesServed" + 1
      WHERE "customerKey" = ${customerKey}
    `;
  } catch {
    // best-effort — never fail image delivery for a counter write
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const subtitle = searchParams.get("subtitle") ?? null;
  const customerKey = searchParams.get("customer") ?? null;
  const urlParam = searchParams.get("url");
  const domainParam = searchParams.get("domain") ?? null;

  const style = searchParams.get("style");

  // --- Card mode: ?url=...&style=card → designed preview from page metadata ---
  // (Beautiful designed card with title/description/favicon — NOT a literal
  // page screenshot. For sites that want a marketing-quality preview, not a
  // shrunken screenshot of the page.)
  if (urlParam && style === "card") {
    const customer = customerKey ? await fetchCustomer(customerKey) : null;
    if (isOverLimit(customer)) {
      return Response.json(
        { error: "free_limit_reached", message: "You have used all 100 free renders. Upgrade to Pro at ogzap.com/upgrade" },
        { status: 429 }
      );
    }

    const isPro = customer?.plan === "PRO";
    const shot = await renderBrandedCard(urlParam, isPro);
    if (shot) {
      // Count only on a delivered card — a render failure (screenshot fallback
      // below) shouldn't burn the user's free quota.
      if (customerKey) void incrementImagesServed(customerKey);
      return new Response(new Uint8Array(shot), { headers: CACHE_HEADERS });
    }
    // Card render unavailable → fall through to the screenshot path so the
    // user still gets *something* useful.
  }

  // --- Screenshot mode: ?url= present ---
  if (urlParam) {
    const customer = customerKey ? await fetchCustomer(customerKey) : null;

    if (isOverLimit(customer)) {
      return Response.json(
        { error: "free_limit_reached", message: "You have used all 100 free renders. Upgrade to Pro at ogzap.com/upgrade" },
        { status: 429 }
      );
    }

    const shot = await captureScreenshot(urlParam);

    if (shot) {
      // Count the render only when we actually delivered a screenshot — a capture
      // failure (branded fallback below) shouldn't burn the user's free quota.
      if (customerKey) void incrementImagesServed(customerKey);
      const isPro = customer?.plan === "PRO";

      if (isPro) {
        // PRO: raw screenshot, no watermark
        return new Response(new Uint8Array(shot), { headers: CACHE_HEADERS });
      }

      // Free plan: overlay "Made with OGzap" watermark via Satori
      const dataUrl = `data:image/png;base64,${shot.toString("base64")}`;

      const screenshotJsx = (
        <div style={{ position: "relative", width: 1200, height: 630, display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} width={1200} height={630} style={{ display: "flex" }} alt="" />
          <div
            style={{
              position: "absolute",
              bottom: 28,
              right: 40,
              fontSize: 18,
              color: "rgba(255,255,255,0.9)",
              background: "rgba(0,0,0,0.6)",
              padding: "5px 14px",
              borderRadius: 8,
              display: "flex",
            }}
          >
            Made with OGzap
          </div>
        </div>
      );

      const img = new ImageResponse(screenshotJsx, { width: 1200, height: 630 });
      return new Response(img.body, { headers: CACHE_HEADERS });
    }

    // Screenshot service unavailable — render a branded link-preview card
    // (looks deliberate, not broken) instead of a bare hostname.
    let host: string;
    try {
      host = new URL(urlParam).hostname.replace(/^www\./, "");
    } catch {
      host = urlParam.replace(/^https?:\/\//, "").replace(/\/.*$/, "").slice(0, 60);
    }
    const fbPrimary = customer?.primaryColor ?? DEFAULT_PRIMARY;
    const fbWatermark = customer?.plan !== "PRO";
    const hostSize = host.length > 22 ? 52 : host.length > 16 ? 66 : 84;

    const fallbackJsx = (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#0b1020",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle 620px at 85% 12%, ${fbPrimary}45 0%, transparent 60%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle 520px at 8% 92%, ${fbPrimary}30 0%, transparent 60%)`,
            display: "flex",
          }}
        />
        {/* Browser-window preview card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            margin: "auto",
            width: 1000,
            height: 470,
            background: "#111827",
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            boxShadow: "0 50px 90px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 68,
              padding: "0 30px",
              background: "#0f1623",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", gap: 11 }}>
              <div style={{ width: 15, height: 15, borderRadius: 8, background: "#ff5f57", display: "flex" }} />
              <div style={{ width: 15, height: 15, borderRadius: 8, background: "#febc2e", display: "flex" }} />
              <div style={{ width: 15, height: 15, borderRadius: 8, background: "#28c840", display: "flex" }} />
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                marginLeft: 26,
                height: 38,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 10,
                alignItems: "center",
                padding: "0 18px",
              }}
            >
              <span style={{ fontSize: 19, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", display: "flex" }}>
                {host}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: "0 64px",
            }}
          >
            <div
              style={{
                fontSize: hostSize,
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                textAlign: "center",
                display: "flex",
              }}
            >
              {host}
            </div>
            <div style={{ marginTop: 20, width: 64, height: 5, background: fbPrimary, borderRadius: 3, display: "flex" }} />
            <div style={{ marginTop: 22, fontSize: 26, color: "rgba(255,255,255,0.5)", display: "flex" }}>
              Social preview
            </div>
          </div>
        </div>
        {fbWatermark && (
          <div
            style={{
              position: "absolute",
              bottom: 30,
              right: 44,
              fontSize: 20,
              color: "rgba(255,255,255,0.45)",
              display: "flex",
            }}
          >
            Made with OGzap
          </div>
        )}
      </div>
    );

    const fbImg = new ImageResponse(fallbackJsx, { width: 1200, height: 630 });
    // Short cache on the fallback so a transient capture failure never sticks
    // (real screenshots keep the long CACHE_HEADERS above).
    return new Response(fbImg.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=120",
        "Vercel-CDN-Cache-Control": "public, max-age=120",
      },
    });
  }

  // --- Text card mode: ?title= present (backward compat) or screenshot fallback ---
  if (!title) {
    return new Response("Missing required param: title or url", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  let customer: OgCustomerRow | null = null;
  if (customerKey && !customer) {
    customer = await fetchCustomer(customerKey);
    if (isOverLimit(customer)) {
      return Response.json(
        { error: "free_limit_reached", message: "You have used all 100 free renders. Upgrade to Pro at ogzap.com/upgrade" },
        { status: 429 }
      );
    }
    void incrementImagesServed(customerKey);
  }

  const primaryColor = customer?.primaryColor ?? DEFAULT_PRIMARY;
  const logoUrl = customer?.logoUrl ?? null;
  const isPro = customer?.plan === "PRO";
  const showWatermark = !isPro;
  const domain = domainParam;

  const clampedTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const clampedSubtitle = subtitle
    ? subtitle.length > 90
      ? subtitle.slice(0, 87) + "…"
      : subtitle
    : null;

  const textJsx = (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "80px 96px",
        background: "#0f172a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 900px 700px at -80px 700px, ${primaryColor}40 0%, transparent 65%)`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          display: "flex",
        }}
      />
      {domain && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 96,
            display: "flex",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 100,
            padding: "8px 20px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.75)",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            {domain}
          </span>
        </div>
      )}
      {logoUrl && (
        <div style={{ position: "absolute", top: 48, right: 64, display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="logo"
            width={80}
            height={80}
            style={{ objectFit: "contain", borderRadius: 12 }}
          />
        </div>
      )}
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1.1,
          maxWidth: 960,
          letterSpacing: "-0.02em",
          display: "flex",
        }}
      >
        {clampedTitle}
      </div>
      <div
        style={{
          marginTop: 28,
          width: 80,
          height: 4,
          backgroundColor: primaryColor,
          borderRadius: 2,
          display: "flex",
        }}
      />
      {clampedSubtitle && (
        <div
          style={{
            marginTop: 20,
            fontSize: 34,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            maxWidth: 900,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          {clampedSubtitle}
        </div>
      )}
      {showWatermark && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 48,
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            display: "flex",
          }}
        >
          Made with OGzap
        </div>
      )}
    </div>
  );

  const img = new ImageResponse(textJsx, { width: 1200, height: 630 });
  return new Response(img.body, { headers: CACHE_HEADERS });
}
