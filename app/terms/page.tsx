export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Keposting",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Effective: 8 August 2026</p>

      <div className="space-y-6 prose prose-slate max-w-none">
        <section>
          <h2 className="text-xl font-semibold">1. Acceptance</h2>
          <p>
            By creating an account or using Keposting (the &quot;Service&quot;), you agree to these
            Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Description of Service</h2>
          <p>
            Keposting is an AI-powered tool that generates social media content (images and
            captions) based on your business profile. The Service uses third-party AI providers
            including Google Gemini and OpenAI.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Accounts</h2>
          <p>
            You must provide accurate information when registering. You are responsible for
            keeping your login credentials secure and for all activity under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
          <p>You agree NOT to use the Service to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generate content that infringes anyone&apos;s intellectual property</li>
            <li>Generate misleading, defamatory, or harassing content</li>
            <li>Create content involving minors in inappropriate contexts</li>
            <li>Reverse-engineer, scrape, or resell the Service</li>
            <li>Violate any applicable laws in your jurisdiction</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Tokens & Payments</h2>
          <p>
            The Service operates on a token system. New users receive complimentary tokens.
            Additional tokens can be purchased in packages. Prices are shown at checkout.
            Payment processing is handled by our payment providers.
          </p>
          <p>
            Tokens are non-transferable and have no cash value. Unused tokens do not expire
            while your account is active.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Refunds</h2>
          <p>
            Refunds are governed by our{" "}
            <a href="/refund" className="text-teal-600 underline">
              Refund Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
          <p>
            You retain ownership of content you generate using the Service and may use it for
            commercial purposes. However, you acknowledge that AI-generated content may not be
            unique and similar outputs may be produced for other users.
          </p>
          <p>
            The Service, its code, and its design remain the property of Keposting.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Warranties &amp; Disclaimer</h2>
          <p>
            The Service is provided &quot;AS IS&quot; without warranties of any kind. We do not
            guarantee that AI-generated content will be accurate, appropriate, or suitable for
            any specific purpose. You are responsible for reviewing content before publishing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Keposting shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the
            Service. Our total liability shall not exceed the amount you paid in the last 12
            months.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate accounts
            that violate these Terms. Upon termination, your access to the Service ends but
            these Terms continue to apply where relevant.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be notified via
            email or in-app. Continued use after changes means you accept the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a href="mailto:info@keposting.com" className="text-teal-600 underline">
              info@keposting.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
