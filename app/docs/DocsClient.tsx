"use client";

import { useState, useCallback } from "react";

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between bg-zinc-900 px-5 py-3">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-bold text-zinc-200 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-zinc-900 px-5 py-5 overflow-x-auto text-sm text-zinc-200 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// All three snippets use ?url= mode → OGzap takes a real 1200x630 screenshot of
// the page that's being shared, not a generic text card. Each platform gets the
// page's actual URL at render time so every share looks like the page itself.

const WORDPRESS_CODE = `// Add to functions.php
add_action('wp_head', function() {
    $u = urlencode(get_permalink());
    echo '<meta property="og:image" content="https://ogzap.com/og?url=' . $u . '&customer=YOURKEY" />';
});`;

const GHOST_CODE = `<!-- Paste into Code Injection -> Site Header
     so social scrapers see the meta tag without running JS. -->
<script>
  (function() {
    var canonical = document.querySelector('link[rel=canonical]');
    var u = encodeURIComponent(canonical ? canonical.href : window.location.href);
    var meta = document.createElement('meta');
    meta.setAttribute('property', 'og:image');
    meta.setAttribute('content', 'https://ogzap.com/og?url=' + u + '&customer=YOURKEY');
    document.head.appendChild(meta);
  })();
</script>`;

const HTML_CODE = `<!-- Replace the url= value with the full URL of THIS page (one per page). -->
<meta property="og:image" content="https://ogzap.com/og?url=https://yoursite.com/this-page&customer=YOURKEY" />`;

export function DocsClient() {
  return (
    <div className="space-y-12">
      {/* WordPress */}
      <section>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.469 6.825c.469 1.408.469 2.977.469 4.175-.156 9.234-6.234 14.452-12.469 14.452-5.921 0-9.469-3.406-9.469-3.406l1.406-3.266s2.719 2.344 5.844 2.344c1.719 0 3.281-.625 4.687-1.719l-4.375-12.094h2.625l2.813 8.891 2.812-8.891h2.625L15 14.688c1.25-2.031 1.719-4.344 1.719-6.188 0-.875-.156-1.719-.375-2.5L21.469 6.825z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900">WordPress</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Add to your theme&apos;s <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">functions.php</code>
            </p>
          </div>
        </div>
        <CodeBlock code={WORDPRESS_CODE} label="PHP · functions.php" />
      </section>

      {/* Ghost */}
      <section>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.371 0 0 5.371 0 12s5.371 12 12 12 12-5.371 12-12S18.629 0 12 0zm-.668 18.419c-3.621 0-6.551-2.93-6.551-6.551s2.93-6.551 6.551-6.551c2.109 0 3.979.999 5.17 2.546H10.26c-2.206 0-3.993 1.787-3.993 3.993s1.787 3.993 3.993 3.993h6.228a6.54 6.54 0 0 1-5.156 2.57z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900">Ghost</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Settings → Code Injection → Site Header
            </p>
          </div>
        </div>
        <CodeBlock code={GHOST_CODE} label="HTML · Code Injection" />
      </section>

      {/* Raw HTML */}
      <section>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900">Raw HTML meta tag</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Any site — paste in your <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">&lt;head&gt;</code>
            </p>
          </div>
        </div>
        <CodeBlock code={HTML_CODE} label="HTML · meta tag" />
      </section>

      {/* Note about YOURKEY */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="text-sm font-black text-amber-900 mb-1">Replace YOURKEY</p>
            <p className="text-sm text-amber-800">
              Replace <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">YOURKEY</code> with your
              actual customer key — find it in your OGzap dashboard.{" "}
              Questions?{" "}
              <a href="mailto:hello@ogzap.com" className="text-violet-700 font-bold hover:underline">
                hello@ogzap.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
