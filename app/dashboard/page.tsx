"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

type CustomerData = {
  plan: string;
  imagesServed: number;
  email: string | null;
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const upgraded = searchParams.get("upgraded") === "1";

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [copied, setCopied] = useState(false);
  const paddleRef = useRef<Paddle | null>(null);

  useEffect(() => {
    if (!key) { setLoading(false); return; }
    fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
      .then((r) => r.json())
      .then((d: CustomerData & { error?: string }) => {
        if (!d.error) setData(d);
      })
      .finally(() => setLoading(false));
  }, [key]);

  // Initialize Paddle.js once on mount so the overlay can open without a page navigation.
  // Previous flow redirected to a hand-constructed `checkout.paddle.com/checkout/{id}` URL
  // which is not a real Paddle Billing endpoint (404).
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    initializePaddle({ token, environment: "production" })
      .then((paddle) => { if (paddle) paddleRef.current = paddle; })
      .catch((e) => console.error("[OgzapDashboard] Paddle init failed", e));
  }, []);

  async function handleUpgrade() {
    if (!paddleRef.current) {
      alert("Checkout is still loading, try again in a moment.");
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const { transactionId, error } = await res.json() as { transactionId?: string; error?: string };
      if (!transactionId) {
        alert(error ?? "Something went wrong");
        return;
      }
      paddleRef.current.Checkout.open({ transactionId });
    } finally {
      setUpgrading(false);
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mono: React.CSSProperties = { fontFamily: "monospace" };
  const card: React.CSSProperties = {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "16px",
  };

  if (!key) {
    return (
      <div style={{ color: "#94a3b8", textAlign: "center", padding: "60px 24px" }}>
        No API key provided.{" "}
        <Link href="/signup" style={{ color: "#4ade80" }}>Get one →</Link>
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: "#64748b", textAlign: "center", padding: "60px" }}>Loading...</div>;
  }

  if (!data) {
    return (
      <div style={{ color: "#f87171", textAlign: "center", padding: "60px 24px" }}>
        Invalid API key.{" "}
        <Link href="/signup" style={{ color: "#4ade80" }}>Sign up →</Link>
      </div>
    );
  }

  const isPro = data.plan === "PRO";
  const usedPct = Math.min(100, Math.round((data.imagesServed / 100) * 100));

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 24px", ...mono }}>
      <Link href="/" style={{ color: "#4ade80", textDecoration: "none", fontSize: "20px", fontWeight: 700, display: "block", marginBottom: "32px" }}>
        ogzap
      </Link>

      {upgraded && (
        <div style={{ background: "#14532d", border: "1px solid #16a34a", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", color: "#4ade80" }}>
          ✓ Upgraded to Pro — unlimited renders
        </div>
      )}

      <div style={card}>
        <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your API key</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <code style={{ color: "#4ade80", fontSize: "13px", wordBreak: "break-all", flex: 1 }}>{key}</code>
          <button
            onClick={copyKey}
            style={{ background: "#334155", border: "none", borderRadius: "6px", padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontFamily: "monospace", fontSize: "13px", whiteSpace: "nowrap" }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Renders</div>
          <div style={{ color: isPro ? "#4ade80" : "#f8fafc", fontSize: "14px" }}>
            {isPro ? "∞ Pro" : `${data.imagesServed} / 100`}
          </div>
        </div>
        {!isPro && (
          <div style={{ background: "#0f172a", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
            <div style={{ background: usedPct >= 90 ? "#f87171" : "#4ade80", width: `${usedPct}%`, height: "100%", transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      {!isPro && (
        <div style={card}>
          <div style={{ color: "#f8fafc", fontWeight: 700, marginBottom: "8px" }}>Upgrade to Pro</div>
          <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "16px" }}>Unlimited renders, no watermark, custom branding. $19/month.</div>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            style={{ background: "#4ade80", color: "#0f172a", border: "none", borderRadius: "8px", padding: "10px 20px", fontFamily: "monospace", fontSize: "14px", fontWeight: 700, cursor: upgrading ? "not-allowed" : "pointer", opacity: upgrading ? 0.7 : 1 }}
          >
            {upgrading ? "Opening…" : "Upgrade to Pro →"}
          </button>
        </div>
      )}

      <div style={{ color: "#475569", fontSize: "13px" }}>
        Bookmark this page — it&apos;s your dashboard.
        {data.email && <span> Key is linked to <span style={{ color: "#64748b" }}>{data.email}</span>.</span>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      <Suspense fallback={<div style={{ color: "#64748b", textAlign: "center", padding: "60px", fontFamily: "monospace" }}>Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
