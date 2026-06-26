"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "not_found" | "rate_limited";

export default function RecoverKeyForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");

    try {
      const res = await fetch("/api/recover-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setState("rate_limited");
        return;
      }

      const data = await res.json();

      if (data.found && data.sent) {
        setState("success");
      } else {
        setState("not_found");
      }
    } catch {
      setState("not_found");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-zinc-100 mb-2">
        Lost your API key?
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        Enter your email and we&apos;ll send it again.
      </p>

      {state === "success" ? (
        <p className="text-green-400 font-medium text-sm">
          Check your inbox — we sent your API key.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={state === "loading"}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 transition-shadow"
          />

          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full px-6 py-3 rounded-xl bg-green-500 text-black font-black text-sm hover:bg-green-400 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "loading" ? "Sending…" : "Send my key →"}
          </button>

          {state === "not_found" && (
            <p className="text-zinc-400 text-sm">
              We couldn&apos;t find an account for this email.
            </p>
          )}

          {state === "rate_limited" && (
            <p className="text-zinc-400 text-sm">
              Too many requests. Try again in an hour.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
