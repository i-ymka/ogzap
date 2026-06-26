import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — OGzap",
  description: "OGzap Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-4">
        <Link href="/" className="text-zinc-900 font-semibold text-lg">
          OGzap
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: June 2026</p>

        <div className="max-w-none space-y-8 text-zinc-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using OGzap (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">2. Description of Service</h2>
            <p>OGzap generates Open Graph preview images (social share cards) for any URL through an API and embeddable image links. The Free plan includes a limited number of renders; the Pro plan raises those limits and unlocks additional features.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">3. Account &amp; API Keys</h2>
            <p>Access to OGzap is tied to an API key issued to your email address. You are responsible for keeping your API key secret and for all usage that occurs under it. You must be at least 18 years old to use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Generate images for illegal, fraudulent, or harmful content</li>
              <li>Infringe on the intellectual property or trademark rights of others</li>
              <li>Abuse, overload, or attempt to bypass the limits of the Service</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">5. Payments and Billing</h2>
            <p>The Pro plan is billed at $19/month through Paddle, our merchant of record. Payments are processed securely by Paddle, who handles billing, invoicing, and order-related inquiries. You are responsible for any taxes applicable to your use of the Service. You can cancel at any time; your Pro access continues until the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">6. Service Availability</h2>
            <p>OGzap is provided on a best-effort basis. We may change, suspend, or discontinue features at any time. We aim for high availability but do not guarantee uninterrupted service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">7. Termination</h2>
            <p>We reserve the right to suspend or revoke your API key if you violate these Terms. You may stop using the Service and cancel your subscription at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">8. Limitation of Liability</h2>
            <p>OGzap is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">9. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">10. Contact</h2>
            <p>For questions about these Terms, contact us at hello@ogzap.com.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
