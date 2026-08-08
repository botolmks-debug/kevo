export const metadata = {
  title: "Refund Policy",
  description: "Refund Policy for Keposting",
};

export default function RefundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Effective: 8 August 2026</p>

      <div className="space-y-6 prose prose-slate max-w-none">
        <section>
          <h2 className="text-xl font-semibold">1. Digital Goods</h2>
          <p>
            Keposting sells tokens, which are digital goods used to power AI generation.
            Because tokens are consumed immediately upon use and the AI processing costs are
            incurred at the point of generation, refund eligibility is limited as described
            below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Automatic Refunds for Failed Generations</h2>
          <p>
            If an AI generation fails due to a technical error on our side, the token is{" "}
            <strong>automatically refunded</strong> to your account balance. You do not need
            to contact us for these cases.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Manual Refunds — Unused Token Packages</h2>
          <p>
            If you have purchased a token package and have <strong>not used any tokens</strong>{" "}
            from that purchase, you may request a refund within <strong>7 days</strong> of the
            purchase. Approved refunds will be returned to your original payment method within
            5-10 business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Service Issues</h2>
          <p>
            If you experience a significant service issue (e.g., extended downtime, systematic
            failures) that prevents you from using tokens you have paid for, please contact
            support. We evaluate these cases individually and may issue partial or full
            refunds at our discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Non-Refundable</h2>
          <p>The following are not eligible for refunds:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Tokens that have already been used to generate content</li>
            <li>
              Refund requests made more than 7 days after purchase (except for service issues
              covered above)
            </li>
            <li>
              Cases where the AI-generated content did not meet subjective quality
              expectations (AI output naturally varies)
            </li>
            <li>Accounts terminated for violating our Terms of Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. How to Request a Refund</h2>
          <p>Send an email to{" "}
            <a href="mailto:info@keposting.com" className="text-teal-600 underline">
              info@keposting.com
            </a>{" "}
            with:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your account email</li>
            <li>Date of purchase</li>
            <li>Order ID (from your receipt)</li>
            <li>Reason for the refund request</li>
          </ul>
          <p>
            We aim to respond within 24 hours. Approved refunds are processed via the original
            payment method.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Chargebacks</h2>
          <p>
            Before initiating a chargeback with your bank or card issuer, please contact us
            first — most issues can be resolved directly and faster than a chargeback process.
            Unwarranted chargebacks may result in account suspension.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Contact</h2>
          <p>
            Refund questions:{" "}
            <a href="mailto:info@keposting.com" className="text-teal-600 underline">
              info@keposting.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
