import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy — OGzap",
  description: "OGzap Refund Policy",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-4">
        <Link href="/" className="text-zinc-900 font-semibold text-lg">
          OGzap
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Refund Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: June 2026</p>

        <div className="max-w-none space-y-8 text-zinc-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">14-Day Money-Back Guarantee</h2>
            <p>We offer a <strong>14-day money-back guarantee</strong> on your first Pro subscription payment. If OGzap isn&rsquo;t a fit within the first 14 days, email us at hello@ogzap.com and we&rsquo;ll refund that payment in full — no questions asked.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">After the First 14 Days</h2>
            <p>After the 14-day window, monthly subscription fees are non-refundable. You can cancel your subscription at any time to stop future charges — your Pro access continues until the end of the current billing period, and you are not charged again.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">Billed in Error?</h2>
            <p>If you believe you were charged in error, contact us at hello@ogzap.com and we will investigate. Because Paddle is our merchant of record, you can also raise billing and refund requests directly with Paddle, who handles order-related inquiries.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">How to Request a Refund</h2>
            <p>Email hello@ogzap.com with:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>The email address on your account</li>
              <li>The date of the charge</li>
              <li>The reason for your request</li>
            </ul>
            <p className="mt-3">We respond within 2 business days. Approved refunds are processed by Paddle within 5&ndash;10 business days, depending on your payment method.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">Contact</h2>
            <p>For refund-related questions, contact us at hello@ogzap.com.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
