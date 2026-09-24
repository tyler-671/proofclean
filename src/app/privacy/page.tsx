import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy · ProofClean",
  description:
    "How ProofClean collects, uses, and protects your data.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: September 2026</p>

        <p className="mt-8 text-base leading-relaxed text-slate-600">
          ProofClean (&quot;ProofClean,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) provides software that helps commercial cleaning
          companies manage jobs, dispatch cleaners, and send their clients
          automated photo-proof confirmation emails. This Privacy Policy explains
          what information we collect, how we use it, and the choices you have. By
          using ProofClean, you agree to the practices described here.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Information we collect
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We collect only the information needed to operate the service:
          </p>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-slate-600">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">
                  Account information.
                </strong>{" "}
                The email address you use to create and sign in to your account,
                and basic business profile details you choose to add (such as your
                business name and logo).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">
                  Operational data you enter.
                </strong>{" "}
                Information you add to run your operation — clients, locations,
                jobs, schedules, cleaner names and contact details, and notes.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">
                  Job-completion photos.
                </strong>{" "}
                Photos your cleaners upload to document completed work, which may
                be included in the proof emails sent to your clients.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">
                  Payment information.
                </strong>{" "}
                Subscription billing is handled by Stripe. We do{" "}
                <strong className="font-semibold text-slate-800">not</strong> store
                or process your full card numbers on our systems; Stripe processes
                payment details on our behalf.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">
                  Limited technical data.
                </strong>{" "}
                Our hosting and infrastructure providers automatically process
                basic technical information (such as IP address and request logs)
                to deliver and secure the service.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            How we use your information
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We use the information we collect to provide, maintain, and improve
            ProofClean — including to authenticate your account, store and display
            your operational data, generate and send automated photo-proof emails
            to your clients on your behalf, process your subscription, respond to
            support requests, and keep the service secure. We do not sell your
            personal information, and we do not use your operational data or photos
            for advertising.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Third-party service providers
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We rely on a small number of trusted providers (subprocessors) to run
            ProofClean. Each processes data only as needed to provide their
            service:
          </p>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-slate-600">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">Supabase</strong>{" "}
                — database, authentication, and file storage (including
                job-completion photos).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">Stripe</strong> —
                payment processing for subscriptions. Stripe handles card details;
                we do not store them.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">Resend</strong> —
                delivery of transactional and photo-proof emails.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>
                <strong className="font-semibold text-slate-800">Vercel</strong> —
                application hosting and content delivery.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Data storage and retention
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We retain your data for as long as your account is active or as needed
            to provide the service. If you delete specific records (such as jobs or
            photos) or close your account, we delete the associated data from our
            active systems, subject to reasonable backup retention and any legal
            obligations. Some job-completion photos may be removed automatically
            after a retention period to keep storage manageable.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Your rights and choices
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            You can access and update most of your information directly in the app.
            You can export your operational data and you can delete your data —
            including closing your account, which removes your account information
            and associated records from our active systems. If you need help
            exercising any of these rights, contact us at{" "}
            <a
              href="mailto:hello@proofclean.ca"
              className="font-medium text-emerald-600 transition hover:text-emerald-700"
            >
              hello@proofclean.ca
            </a>
            .
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Security</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We take reasonable technical and organizational measures to protect
            your data, including encryption in transit, access controls, and
            row-level data isolation so that each account can only access its own
            records. No method of transmission or storage is completely secure, but
            we work to protect your information and to promptly address issues if
            they arise.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Children&apos;s privacy
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            ProofClean is a business tool intended for use by companies and their
            staff. It is not directed to children, and we do not knowingly collect
            personal information from anyone under the age of majority. If you
            believe a minor has provided us information, contact us and we will
            delete it.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Changes to this policy
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We may update this Privacy Policy from time to time. When we make
            material changes, we will update the &quot;Last updated&quot; date above
            and, where appropriate, notify you. Your continued use of ProofClean
            after an update means you accept the revised policy.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Contact us</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            If you have questions about this Privacy Policy or how we handle your
            data, email us at{" "}
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
