import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — OGzap",
  description: "OGzap Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-4">
        <Link href="/" className="text-zinc-900 font-semibold text-lg">
          OGzap
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: June 2026</p>

        <div className="max-w-none space-y-8 text-zinc-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">1. Information We Collect</h2>
            <p>We collect the email address you provide when you sign up for an API key, along with payment information when you upgrade. We also collect usage data such as the URLs you render and the number of API requests you make.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide and improve the OGzap service</li>
              <li>Enforce plan limits and process payments</li>
              <li>Send your API key, receipts, and important service notices</li>
              <li>Respond to your support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">3. URLs You Submit</h2>
            <p>When you request a preview image for a URL, OGzap fetches that page to generate the image. We do not sell or repurpose the URLs you submit; they are used only to render your images and may be cached to serve them faster.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">4. Payment Processing</h2>
            <p>Payments are processed by Paddle, our merchant of record. We do not store your full credit card details. Paddle&rsquo;s privacy policy governs the handling of your payment information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">5. Information Sharing</h2>
            <p>We do not sell your personal information. We share data only with service providers necessary to operate OGzap (hosting, analytics, email delivery, payment processing) and when required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">6. Cookies</h2>
            <p>We use minimal cookies and analytics to understand how the Service is used. You can disable cookies in your browser settings, but some features may not work correctly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">7. Data Retention</h2>
            <p>We retain your account data as long as your account is active. After account deletion, we may retain certain data for up to 90 days for legal and operational purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">8. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at hello@ogzap.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">9. Security</h2>
            <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 mb-3">11. Contact</h2>
            <p>For privacy-related questions, contact us at hello@ogzap.com.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
