"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "existing" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { success?: boolean; existing?: boolean; error?: string };

      if (!res.ok || !data.success) {
        if (data.error === "invalid_email") {
          setError("Enter a valid email address.");
        } else {
          setError("Something went wrong. Try again.");
        }
        setStatus("error");
        return;
      }

      setStatus(data.existing ? "existing" : "success");
    } catch {
      setError("Network error. Try again.");
      setStatus("error");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "monospace",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Link href="/" style={{ color: "#4ade80", textDecoration: "none", fontSize: "20px", fontWeight: 700, display: "block", marginBottom: "40px" }}>
          ogzap
        </Link>

        {status === "success" || status === "existing" ? (
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#f8fafc", marginBottom: "12px" }}>
              Check your inbox
            </div>
            <p style={{ color: "#94a3b8", marginBottom: "24px", lineHeight: 1.6 }}>
              {status === "existing"
                ? "You already have an account — we sent your API key to "
                : "Your API key is on its way to "}
              <span style={{ color: "#f8fafc" }}>{email}</span>.
            </p>
            <p style={{ color: "#64748b", fontSize: "14px" }}>
              Didn&apos;t get it?{" "}
              <button
                onClick={() => { setStatus("idle"); setEmail(""); }}
                style={{ color: "#4ade80", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "monospace", fontSize: "14px" }}
              >
                Try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
              Get your API key
            </div>
            <p style={{ color: "#94a3b8", marginBottom: "32px" }}>
              Free — 100 renders/month. No credit card.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontFamily: "monospace",
                  fontSize: "15px",
                  marginBottom: "12px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              {status === "error" && (
                <p style={{ color: "#f87171", fontSize: "14px", marginBottom: "12px" }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#4ade80",
                  color: "#0f172a",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: status === "loading" ? "not-allowed" : "pointer",
                  opacity: status === "loading" ? 0.7 : 1,
                }}
              >
                {status === "loading" ? "Sending..." : "Send my API key →"}
              </button>
            </form>

            <p style={{ color: "#475569", fontSize: "13px", marginTop: "20px", textAlign: "center" }}>
              Already have a key?{" "}
              <Link href="/#recover" style={{ color: "#4ade80" }}>Recover it</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
