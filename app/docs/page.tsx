import type { Metadata } from "next";
import Link from "next/link";
import { DocsClient } from "./DocsClient";

export const metadata: Metadata = {
  title: "Add OGzap to your site — Docs",
  description:
    "Three ready-to-paste code snippets for WordPress, Ghost, and raw HTML. Get auto-generated branded OG images on every page.",
};

export default function DocsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black tracking-tight text-violet-700">
              OGzap
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-bold text-zinc-900">Docs</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        {/* Header */}
        <div className="mb-14">
          <span className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-xs font-black uppercase tracking-widest rounded-full mb-5">
            Docs
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-5">
            Add OGzap to your site
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed">
            Pick your platform below, paste the snippet, and every page you share will show
            a beautiful branded OG image — automatically.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">WordPress</span>
            <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">Ghost</span>
            <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">Raw HTML</span>
            <span className="px-3 py-1 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">Any site</span>
          </div>
        </div>

        <DocsClient />

        {/* Footer links */}
        <div className="mt-16 pt-10 border-t border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            Need help?{" "}
            <a
              href="mailto:hello@ogzap.com"
              className="text-violet-600 font-semibold hover:underline"
            >
              hello@ogzap.com
            </a>
          </p>
          <Link href="/" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
            ← OGzap home
          </Link>
        </div>
      </main>
    </div>
  );
}
