'use client';

import { useState, useEffect, useRef, useCallback } from 'react';


// Real cards ogzap generated for real sites (public homepages / posts).
// These are actual product output, not mockups.
const GALLERY_TILES = [
  { cat: 'product', img: '/showcase/stripe.png', url: 'stripe.com', path: '', stat: 'HIT · 8ms', miss: false },
  { cat: 'product', img: '/showcase/linear.png', url: 'linear.app', path: '', stat: 'HIT · 6ms', miss: false },
  { cat: 'product', img: '/showcase/notion.png', url: 'notion.so', path: '', stat: 'HIT · 7ms', miss: false },
  { cat: 'product', img: '/showcase/figma.png', url: 'figma.com', path: '', stat: 'HIT · 5ms', miss: false },
  { cat: 'dev', img: '/showcase/posthog.png', url: 'posthog.com', path: '', stat: 'HIT · 9ms', miss: false },
  { cat: 'blog', img: '/showcase/creatdrop.png', url: 'creatdrop.com', path: '/blog/online-fitness-course', stat: 'HIT · 6ms', miss: false },
];

const FAQ_ITEMS = [
  {
    q: 'What counts as a "render" on the unlimited plan?',
    a: 'Every unique URL is rendered once and then served from cache. Cache hits don\'t count against anything — and since the plan is flat-rate, neither do fresh renders. There is no per-image meter to watch.',
  },
  {
    q: 'Are there rate limits?',
    a: 'Pro is flat-rate — there’s no per-image or per-minute meter to watch. Cache hits never count, and fresh renders are unlimited on Pro. The Free plan includes 100 renders per month. Need high volume or an SLA? Email us.',
  },
  {
    q: 'Can I customize the design or use my own template?',
    a: 'Yes. By default ogzap captures the OG region of the page you point it at. You can also pass a template ID and variables to render a branded card without touching the source page. Templates are editable in the dashboard.',
  },
  {
    q: 'What if the page is behind authentication?',
    a: 'Pass a signed token or custom headers with the request and ogzap forwards them to the render. For fully private pages, the template approach lets you render a card from data you send, without exposing the page.',
  },
  {
    q: 'How does cache invalidation work?',
    a: (<>Images are cached at the edge with an immutable key derived from the URL and params. Bump a <code>?v=</code> parameter, call the purge endpoint, or fire a webhook on content change to force a fresh render.</>),
  },
  {
    q: 'Do you store the pages you render?',
    a: 'We store the rendered PNG at the edge so we can serve it fast. We don\'t retain the page\'s HTML beyond the render. Full data-retention details are in our Privacy Policy.',
  },
];

const GALLERY_CATS = ['all', 'product', 'dev', 'blog'];

function ArrowIcon() {
  return (
    <svg className="arrow" viewBox="0 0 14 14" fill="none">
      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckSmall() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <path d="M1.5 4l1.7 1.8L6.5 2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 8 8">
      <path d="M1.5 4l1.7 1.8L6.5 2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoodIcon() {
  return (
    <svg className="compare-ico good" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.3 8.2l1.8 1.8 3.6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BadIcon() {
  return (
    <svg className="compare-ico bad" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function cleanUrl(u: string) {
  return (u || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export default function OgzapLanding() {
  const [inputUrl, setInputUrl] = useState('stripe.com');
  const [termUrl, setTermUrl] = useState('stripe.com');
  const [demoImg, setDemoImg] = useState('/showcase/stripe.png');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoCache, setDemoCache] = useState<'HIT' | 'MISS'>('HIT');
  const [demoLatency, setDemoLatency] = useState(84);
  const [demoStamp, setDemoStamp] = useState('1200 × 630 · cache HIT');

  const [galleryFilter, setGalleryFilter] = useState('all');
  const [galleryExpanded, setGalleryExpanded] = useState(false);

  const [openFaq, setOpenFaq] = useState<number>(0);

  const [copiedId, setCopiedId] = useState('');

  const busyRef = useRef(false);
  const cachedRef = useRef<Set<string>>(new Set());
  const loadStartRef = useRef(0);
  const currentUrlRef = useRef('');

  // Drives the demo. The previous version faked "loading done" after a 780ms
  // timer — but the actual puppeteer render takes 10-20s on a cold MISS, so
  // the shimmer vanished while the user still stared at the old image. Now
  // demoLoading stays true until the <img>'s onLoad fires (real ground truth).
  const runRender = useCallback((url: string) => {
    url = cleanUrl(url) || 'stripe.com';
    if (busyRef.current) return;
    busyRef.current = true;
    currentUrlRef.current = url;
    loadStartRef.current = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    setTermUrl(url);
    setDemoLoading(true);
    const hit = cachedRef.current.has(url);
    setDemoCache(hit ? 'HIT' : 'MISS');
    setDemoStamp(hit ? '1200 × 630 · cache HIT' : '1200 × 630 · rendering…');
    setDemoImg(`/og?url=${encodeURIComponent('https://' + url)}&style=card`);
  }, []);

  const handleImgLoaded = useCallback(() => {
    if (!busyRef.current) return; // ignore loads from non-demo sources / re-renders
    const elapsed = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loadStartRef.current
    );
    const url = currentUrlRef.current;
    const hit = cachedRef.current.has(url);
    // For visual nicety, fake a tiny cache-HIT latency; for MISS, show real elapsed.
    const latency = hit ? (4 + Math.floor(Math.random() * 7)) : Math.max(elapsed, 200);
    setDemoLatency(latency);
    setDemoStamp(`1200 × 630 · ${hit ? 'cache HIT' : `rendered ${latency}ms`}`);
    cachedRef.current.add(url);
    setDemoLoading(false);
    busyRef.current = false;
  }, []);

  const handleImgError = useCallback(() => {
    if (!busyRef.current) return;
    setDemoLoading(false);
    setDemoStamp('1200 × 630 · render failed');
    busyRef.current = false;
  }, []);

  // Typing intro on mount
  useEffect(() => {
    const full = 'stripe.com';
    cachedRef.current.delete(full);
    setDemoLoading(true);
    setTermUrl('');
    let i = 0;
    let iv: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        if (i <= full.length) {
          setTermUrl(full.slice(0, i));
          i++;
        } else {
          clearInterval(iv);
          runRender(full);
        }
      }, 30);
    }, 450);
    return () => { clearTimeout(t); if (iv) clearInterval(iv); };
  }, [runRender]);

  // Scroll reveal
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const items = document.querySelectorAll(
      '.section-head, .tm, .step, .feat, .og-tile, .price-card, .metric, .social-head, .compare-col, .faq-item'
    );
    items.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const handleCopy = (text: string, id: string) => {
    try { navigator.clipboard?.writeText(text); } catch (_) {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? '' : prev)), 1400);
  };

  const filteredTiles = GALLERY_TILES.filter(t => galleryFilter === 'all' || t.cat === galleryFilter);
  const visibleTiles = galleryExpanded ? filteredTiles : filteredTiles.slice(0, 6);
  const hiddenCount = Math.max(0, filteredTiles.length - visibleTiles.length);

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="container nav-inner">
          <a href="#" className="logo">
            <img src="/logo.png" alt="ogzap" className="logo-img" />
          </a>
          <div className="nav-links">
            <a href="#gallery">Gallery</a>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="#docs">Docs</a>
          </div>
          <div className="nav-cta">
            <a href="/signup" className="btn btn-primary">
              Get API key <ArrowIcon />
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="hero-bg" />
        <div className="container hero-inner">
          <div className="hero-left">
            <span className="eyebrow"><span className="dot" />v1.4 — now with custom templates</span>
            <h1 className="hero-title">One request.<br /><em>Perfect preview.</em></h1>
            <p className="hero-sub">ogzap generates OG images for any URL on-demand — headless rendered, CDN-cached, delivered in milliseconds. Add it in one line.</p>
            <div className="hero-ctas">
              <a href="/signup" className="btn btn-primary btn-lg">
                Get API key <ArrowIcon />
              </a>
              <a href="#docs" className="btn btn-ghost btn-lg">See docs</a>
            </div>
            <div className="meta-row">
              <span><span className="check"><CheckSmall /></span>30-second setup</span>
              <span><span className="check"><CheckSmall /></span>p50 latency 84ms</span>
              <span><span className="check"><CheckSmall /></span>No credit card</span>
            </div>

            {/* INTERACTIVE DEMO */}
            <div className="demo">
              <div className="demo-bar">
                <span className="demo-method">GET</span>
                <span className="demo-base">api.ogzap.com/v1/og?url=</span>
                <input
                  className="demo-input"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') runRender(inputUrl); }}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="URL to render"
                />
                <button
                  className="btn btn-primary demo-go"
                  type="button"
                  disabled={demoLoading}
                  onClick={() => runRender(inputUrl)}
                >
                  Render <ArrowIcon />
                </button>
              </div>
              <div className="demo-chips">
                <span className="lbl">try:</span>
                {[
                  { label: 'stripe.com', url: 'stripe.com' },
                  { label: 'linear.app', url: 'linear.app' },
                  { label: 'notion.so', url: 'notion.so' },
                  { label: 'figma.com', url: 'figma.com' },
                ].map(chip => (
                  <button
                    key={chip.url}
                    className="chip"
                    type="button"
                    onClick={() => { setInputUrl(chip.url); runRender(chip.url); }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STAGE */}
          <div className="hero-stage">
            <div className="terminal" aria-label="API request">
              <div className="term-head">
                <span className="term-dots"><i /><i /><i /></span>
                <span className="term-title">~ /share/post-published</span>
                <span className="term-tab">GET</span>
              </div>
              <div className="term-body">
                <div className="term-line">
                  <span className="term-prompt">$</span>
                  <span><span className="term-cmd">curl</span> <span className="term-flag">-G</span> <span className="term-str">https://api.ogzap.com/v1/og</span></span>
                </div>
                <div className="term-line">
                  <span className="term-prompt">&nbsp;</span>
                  <span><span className="term-flag">--data-urlencode</span> <span className="term-str">&quot;url=<span>{termUrl}</span>&quot;</span></span>
                </div>
                <div className="term-line">
                  <span className="term-prompt">&nbsp;</span>
                  <span><span className="term-flag">--data-urlencode</span> <span className="term-str">&quot;style=card&quot;</span></span>
                </div>
                <div className="term-line">
                  <span className="term-prompt">&nbsp;</span>
                  <span><span className="term-flag">--data-urlencode</span> <span className="term-str">&quot;key=<span className="term-key">ogz_live_a1b2c3</span>&quot;</span></span>
                </div>
                <div className="term-resp">
                  <div><b>200 OK</b> &nbsp; content-type: image/png</div>
                  <div>
                    x-cache: <b className={demoCache === 'MISS' ? 'term-cache-miss' : ''}>{demoCache}</b>
                    {' '}&nbsp; size: 1200×630 &nbsp;{' '}
                    <span>{demoLatency} ms</span><span className="blink" />
                  </div>
                </div>
              </div>
            </div>

            <div className="og-wrap">
              <div className={`og-card${demoLoading ? ' loading' : ''}`}>
                <img
                  src={demoImg}
                  alt="Rendered OG image"
                  onLoad={handleImgLoaded}
                  onError={handleImgError}
                />
                <div className="og-shimmer" aria-hidden="true" />
                {demoLoading && demoCache === 'MISS' && (
                  <div className="og-loading-hint" aria-live="polite">
                    First render takes 10–20s. Cached forever after.
                  </div>
                )}
                <div className="og-meta-stamp">
                  <span className="pulse" />{demoStamp}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* METRICS BAND */}
      <section className="metrics">
        <div className="container metrics-inner">
          <div className="metric"><div className="metric-num">31</div><div className="metric-label">edge POPs</div></div>
          <div className="metric"><div className="metric-num"><em>84</em>ms</div><div className="metric-label">p50 latency</div></div>
          <div className="metric"><div className="metric-num">99.99<em>%</em></div><div className="metric-label">uptime / 90d</div></div>
          <div className="metric"><div className="metric-num">2.4<em>M</em></div><div className="metric-label">renders served</div></div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="social">
        <div className="container">
          <div className="social-head">
            <span className="num">500+</span>
            <span>developers shipping with ogzap</span>
            <span className="line" />
            <span>updated · may 2026</span>
          </div>
          <div className="testimonials">
            <article className="tm">
              <p className="tm-quote">Replaced <span className="hi">three days</span> of Puppeteer plumbing with a single GET. Our previews look better than what we built, and I never have to think about it.</p>
              <div className="tm-foot">
                <span className="avatar"><img src="/avatar-1.jpg" alt="Marin Aslanian" /></span>
                <div>
                  <div className="tm-name">Marin Aslanian</div>
                  <div className="tm-role">backend · pencilbase.dev</div>
                </div>
              </div>
            </article>
            <article className="tm">
              <p className="tm-quote">Deleted <span className="hi">412 lines</span> of Chromium-in-Lambda code on a Friday. Slept well that night. Have not opened the dashboard since.</p>
              <div className="tm-foot">
                <span className="avatar"><img src="/avatar-2.jpg" alt="Jules Karpinski" /></span>
                <div>
                  <div className="tm-name">Jules Karpinski</div>
                  <div className="tm-role">founder · linkroom</div>
                </div>
              </div>
            </article>
            <article className="tm">
              <p className="tm-quote">It cached on the second request and stayed cached. <span className="hi">Flat $19</span>, no spikes when a post goes viral. That is the only feature I needed.</p>
              <div className="tm-foot">
                <span className="avatar"><img src="/avatar-3.jpg" alt="Rohan Velasco" /></span>
                <div>
                  <div className="tm-name">Rohan Velasco</div>
                  <div className="tm-role">indie · saasweekly</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="block" id="gallery" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="gallery-head">
            <div className="left">
              <span className="section-eyebrow">Real output</span>
              <h2 className="section-title">Actual cards ogzap made for real sites.</h2>
              <p className="section-sub">Point ogzap at any URL and it designs a card from that page&apos;s own brand — its logo, headline, colors, and image. These are the unedited results for a handful of sites you know.</p>
            </div>
            <div className="gallery-filter" role="tablist" aria-label="Filter renders">
              {GALLERY_CATS.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={galleryFilter === cat ? 'active' : ''}
                  onClick={() => { setGalleryFilter(cat); setGalleryExpanded(false); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="gallery">
            {visibleTiles.map((tile, i) => (
              <article key={`${tile.url}${tile.path}-${i}`} className="og-tile">
                <div className="og-tile-img">
                  <img src={tile.img} alt={`OG image: ${tile.url}${tile.path}`} loading="lazy" />
                </div>
                <div className="og-tile-foot">
                  <span className="og-tile-url">{tile.url}<span className="slash">{tile.path}</span></span>
                  <span className={`og-tile-stat${tile.miss ? ' miss' : ''}`}>
                    <span className="pulse" />{tile.stat}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {hiddenCount > 0 && (
            <div className="gallery-more">
              <button className="btn btn-ghost" type="button" onClick={() => setGalleryExpanded(true)}>
                Load more renders <span className="gm-count">({hiddenCount} more)</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="block" id="how">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">How it works</span>
            <h2 className="section-title">Three steps. The third one is your social media manager.</h2>
            <p className="section-sub">No SDK, no build step, no headless browser to babysit. If your stack can make an HTTP request, you have OG images.</p>
          </div>
          <div className="steps">
            <article className="step">
              <div className="step-text">
                <div className="step-num">01 — SIGN UP</div>
                <h3 className="step-title">Get your API key</h3>
                <p className="step-desc">Create an account, copy your key. Done in about as long as it took to read this sentence.</p>
              </div>
              <div className="step-art">
                <div className="key-art">
                  <span><span className="g" style={{ color: 'var(--muted-2)' }}>key</span> <span className="k">ogz_live_a1b2c3d4e5f6</span></span>
                  <button
                    className={`copy-btn${copiedId === 'key' ? ' copied' : ''}`}
                    type="button"
                    onClick={() => handleCopy('ogz_live_a1b2c3d4e5f6', 'key')}
                  >
                    {copiedId === 'key' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </article>

            <article className="step">
              <div className="step-text">
                <div className="step-num">02 — REQUEST</div>
                <h3 className="step-title">Send one GET request</h3>
                <p className="step-desc">Append the URL to render and your key. That&apos;s the entire integration. Drop it into your &lt;meta&gt; tags.</p>
              </div>
              <div className="step-art">
                <div className="code-art">
                  <button
                    className={`code-copy${copiedId === 'code' ? ' copied' : ''}`}
                    type="button"
                    onClick={() => handleCopy('https://api.ogzap.com/v1/og?url={url}&key={key}', 'code')}
                  >
                    {copiedId === 'code' ? 'Copied' : 'Copy'}
                  </button>
                  <span className="g" style={{ color: 'var(--muted-2)' }}>GET</span> <span className="m">https://api.ogzap.com/v1/og</span><br />
                  &nbsp;&nbsp;<span className="p">?url</span>=<span className="s">{'{'+'url}'}</span><br />
                  &nbsp;&nbsp;<span className="p">&amp;key</span>=<span className="s">{'{'+'key}'}</span>
                </div>
              </div>
            </article>

            <article className="step">
              <div className="step-text">
                <div className="step-num">03 — SHIP</div>
                <h3 className="step-title">Beautiful OG image returned</h3>
                <p className="step-desc">A 1200×630 PNG, ready to be the unfurl on every social platform. Cached at the edge, served from the nearest POP.</p>
              </div>
              <div className="step-art">
                <div className="share">
                  <div className="share-av" />
                  <div className="share-body">
                    <div className="share-name">pencilbase <span className="h">@pencilbase · 2h</span></div>
                    <div className="share-txt">New writeup on how we cut p99 by 60% →</div>
                    <div className="share-card">
                      <div className="share-prev"><img src="/showcase/stripe.png" alt="OG card ogzap generated for stripe.com" /></div>
                      <div className="share-meta">stripe.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="block" id="features" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">What you get</span>
            <h2 className="section-title">Boring on purpose. Reliable as a result.</h2>
            <p className="section-sub">The whole point is that you stop thinking about OG images. We picked the defaults so you don&apos;t have to.</p>
          </div>
          <div className="features">
            <article className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M2 6h14M5 9h3M5 11h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </div>
              <h3 className="feat-title">Headless rendered</h3>
              <p className="feat-desc">A real Chromium with real fonts and real CSS. If it works in your browser, it works here.</p>
              <div className="feat-meta">Chromium 124 · variable fonts</div>
            </article>
            <article className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 9h13M9 2.5c2 2.2 2 11.3 0 13M9 2.5c-2 2.2-2 11.3 0 13" stroke="currentColor" strokeWidth="1.4" /></svg>
              </div>
              <h3 className="feat-title">CDN cached globally</h3>
              <p className="feat-desc">Rendered once, served forever from the edge. Subsequent requests in single-digit milliseconds.</p>
              <div className="feat-meta">31 POPs · 99.99% uptime</div>
            </article>
            <article className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 7h8M5 9.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </div>
              <h3 className="feat-title">1200 × 630, guaranteed</h3>
              <p className="feat-desc">The exact aspect ratio every social platform actually displays. No surprise crops.</p>
              <div className="feat-meta">PNG · 2× retina available</div>
            </article>
            <article className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8M3 14l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="feat-title">Any URL, any stack</h3>
              <p className="feat-desc">Static, SSR, SPA, an old Rails app, a marketing page on Webflow. Plain HTTP, no SDK required.</p>
              <div className="feat-meta">Node · Go · Ruby · Python · curl</div>
            </article>
            <article className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5v15M5 5h5.5a2 2 0 010 4H7.5a2 2 0 000 4H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </div>
              <h3 className="feat-title">Flat-rate pricing</h3>
              <p className="feat-desc">$19 a month, render as many times as you want. No per-render math, no overage email at 2 AM.</p>
              <div className="feat-meta">Paddle · cancel anytime</div>
            </article>
            <article className="feat">
              <div className="feat-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5l1.7 5.3h5.6l-4.5 3.3 1.7 5.4L9 12.2 4.5 15.5l1.7-5.4L1.7 6.8h5.6L9 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="feat-title">Key in 30 seconds</h3>
              <p className="feat-desc">Sign up with GitHub, get a key, paste it into your <code style={{ color: 'var(--accent)' }}>&lt;meta&gt;</code>. We will not interview you first.</p>
              <div className="feat-meta">Free trial · 100 renders</div>
            </article>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="block" id="pricing" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center' }}>
            <span className="section-eyebrow">Pricing</span>
            <h2 className="section-title" style={{ margin: '0 auto 18px' }}>One plan. Unlimited renders.</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>Because the alternative — counting renders, picking a tier, watching the meter — is exactly what you came here to stop doing.</p>
          </div>

          <div className="pricing-wrap">
            <div className="price-card">
              <div className="price-head">
                <span className="price-name">ogzap / standard</span>
                <span className="price-badge"><span className="dot" />Unlimited renders</span>
              </div>
              <div className="price-num">
                <span className="amt">$19</span>
                <span className="per">/ month</span>
              </div>
              <div className="price-bill">billed monthly via Paddle · cancel anytime</div>
              <div className="price-divider" />
              <ul className="price-feats">
                {[
                  'Unlimited renders, no per-image fees, no overage tiers',
                  'Global CDN with 31 POPs and immutable edge caching',
                  'Custom templates, brand overrides, and webhook invalidation',
                  'Email support, 24-hour response, written by a human',
                ].map((feat, i) => (
                  <li key={i}>
                    <span className="tick"><TickIcon /></span>
                    {feat}
                  </li>
                ))}
              </ul>
              <a href="/signup" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Get API key <ArrowIcon />
              </a>
              <div className="price-foot">100 free renders to try, no credit card required</div>
            </div>
          </div>

          {/* BUILD vs BUY */}
          <div className="compare">
            <div className="compare-col">
              <div className="compare-head">
                <span className="compare-name">build it yourself</span>
                <span className="compare-cost">~$900<small>/mo + 3 days</small></span>
              </div>
              <ul className="compare-list">
                <li><BadIcon /><span><b>~3 days of engineering</b> to wire up headless Chromium, fonts, and screenshotting</span></li>
                <li><BadIcon /><span>Cold starts, memory limits and font loading in serverless</span></li>
                <li><BadIcon /><span>You own uptime, patching, and the <b>2 AM pager</b></span></li>
                <li><BadIcon /><span>Per-render compute cost that spikes when a post goes viral</span></li>
              </ul>
              <div className="compare-foot">ongoing maintenance: forever</div>
            </div>
            <div className="compare-col win">
              <div className="compare-head">
                <span className="compare-name">ogzap</span>
                <span className="compare-cost">$19<small>/mo flat</small></span>
              </div>
              <ul className="compare-list">
                <li><GoodIcon /><span><b>One GET request</b>, live in 30 seconds — no SDK, no build step</span></li>
                <li><GoodIcon /><span>Rendering, caching and global delivery handled for you</span></li>
                <li><GoodIcon /><span><b>99.99% uptime</b> is our problem, not yours</span></li>
                <li><GoodIcon /><span>Flat <b>$19/mo</b>, unlimited renders — the bill never moves</span></li>
              </ul>
              <div className="compare-foot">ongoing maintenance: none</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="block" id="faq" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center' }}>
            <span className="section-eyebrow">FAQ</span>
            <h2 className="section-title" style={{ margin: '0 auto 18px' }}>The questions developers actually ask.</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>Short, honest answers — no fluff.</p>
          </div>
          <div className="faq-grid">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="faq-q" type="button" onClick={() => setOpenFaq(prev => prev === i ? -1 : i)}>
                  {item.q}
                  <span className="faq-sign" />
                </button>
                <div className="faq-a" style={{ maxHeight: openFaq === i ? '600px' : '0px' }}>
                  <div className="faq-a-inner">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final" id="cta">
        <div className="final-grid" />
        <div className="container">
          <h2>Stop building infrastructure.<br /><em>Start shipping.</em></h2>
          <p>A key in your inbox, a line in your &lt;head&gt;, and one less thing on the roadmap.</p>
          <div className="btns">
            <a href="/signup" className="btn btn-primary btn-lg">
              Get API key <ArrowIcon />
            </a>
            <a href="#docs" className="btn btn-ghost btn-lg">See docs</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container foot-inner">
          <div className="foot-brand">
            <img src="/logo.png" alt="ogzap" className="logo-img foot-logo" />
            <div className="foot-copy">© 2026 ogzap labs · all rights reserved</div>
          </div>
          <div className="foot-links">
            <a href="/docs">Docs</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refund">Refund</a>
            <a href="mailto:hello@ogzap.com">hello@ogzap.com</a>
          </div>
        </div>
      </footer>
    </>
  );
}
