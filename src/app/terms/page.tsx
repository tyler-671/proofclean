import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms of Service · ProofClean",
  description: "The terms that govern your use of ProofClean.",
};

// Change this single value to update the governing jurisdiction everywhere.
const GOVERNING_LAW = "the Province of Alberta, Canada";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <header className="w-full px-4 sm:px-0">
        <nav className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 py-5 sm:px-6">
          <Logo href="/" size="md" />
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            ← Back to home
          </Link>
        </nav>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: September 2026</p>

        <p className="mt-8 text-base leading-relaxed text-slate-600">
          These Terms of Service (&quot;Terms&quot;) govern your access to and use
          of ProofClean (the &quot;Service&quot;), software that helps commercial
          cleaning companies manage jobs, dispatch cleaners, and send clients
          automated photo-proof confirmation emails. Please read them carefully.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            1. Acceptance of terms
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            By creating an account or using the Service, you agree to be bound by
            these Terms. If you are using ProofClean on behalf of a business, you
            represent that you have authority to bind that business to these Terms.
            If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            2. Description of the service
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            ProofClean provides tools to organize clients, locations, and jobs;
            assign and dispatch cleaners; collect job-completion photos; and send
            automated proof-of-clean emails to your clients. We may add, change, or
            remove features over time to improve the Service.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            3. Accounts and responsibilities
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activity under your account. You agree to
            provide accurate information and to keep it up to date. You are
            responsible for the data you and your team enter, including obtaining
            any necessary consent from your clients and staff to store their
            information and to send them proof emails.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            4. Subscription, billing, and refunds
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            ProofClean is offered on a subscription basis at $59 CAD per month,
            billed in advance through our payment processor, Stripe. Your
            subscription renews automatically each billing period until cancelled.
            You can cancel anytime, and your subscription will remain active through
            the end of the current billing period. We offer a 30-day refund: if you
            are not completely satisfied, contact us within 30 days of your initial
            payment for a full refund. Prices may change on a going-forward basis,
            and we will give reasonable notice of any change.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">5. Acceptable use</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            You agree not to misuse the Service. This includes not using ProofClean
            to break the law, infringe others&apos; rights, upload malicious code,
            attempt to gain unauthorized access to our systems or other accounts,
            interfere with the Service&apos;s operation, or upload content you do
            not have the right to share. We may suspend accounts that violate these
            Terms.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            6. Your content and data
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            You own the data and photos you and your team submit to ProofClean
            (&quot;Your Content&quot;). You grant us a limited, non-exclusive
            license to host, store, process, and transmit Your Content solely as
            needed to provide and improve the Service — for example, to store job
            photos and to send proof emails to your clients on your behalf. We do
            not claim ownership of Your Content, and we will not sell it.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            7. Third-party services
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The Service relies on third-party providers, including Supabase
            (database, authentication, and storage), Stripe (payments), Resend
            (email delivery), and Vercel (hosting). Your use of the Service is also
            subject to those providers&apos; terms where applicable. We are not
            responsible for the acts or omissions of third-party providers.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">8. Disclaimers</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The Service is provided &quot;as is&quot; and &quot;as available,&quot;
            without warranties of any kind, whether express or implied, including
            fitness for a particular purpose and non-infringement. We do not
            warrant that the Service will be uninterrupted, error-free, or that
            emails will always be delivered.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            9. Limitation of liability
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            To the maximum extent permitted by law, ProofClean will not be liable
            for any indirect, incidental, special, consequential, or punitive
            damages, or for any loss of profits, data, or goodwill. Our total
            liability for any claim relating to the Service will not exceed the
            amount you paid us in the twelve months before the event giving rise to
            the claim.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">10. Termination</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            You may stop using the Service and cancel your subscription at any time.
            We may suspend or terminate your access if you violate these Terms or if
            necessary to protect the Service or other users. Upon termination, your
            right to use the Service ends, and we will handle your data as described
            in our{" "}
            <Link
              href="/privacy"
              className="font-medium text-emerald-600 transition hover:text-emerald-700"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            11. Changes to these terms
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We may update these Terms from time to time. When we make material
            changes, we will update the &quot;Last updated&quot; date above and,
            where appropriate, notify you. Your continued use of the Service after an
            update means you accept the revised Terms.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">12. Governing law</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            These Terms are governed by the laws of {GOVERNING_LAW}, without regard
            to its conflict-of-laws principles. You agree to the exclusive
            jurisdiction of the courts located there for any dispute arising from
            these Terms or the Service.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">13. Contact us</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Questions about these Terms? Email us at{" "}
            <a
              href="mailto:hello@proofclean.ca"
              className="font-medium text-emerald-600 transition hover:text-emerald-700"
            >
              hello@proofclean.ca
            </a>
            .
          </p>
        </section>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            ← Back to home
          </Link>
        </div>
      </article>
    </main>
  );
}
