import { Suspense } from "react";
import Logo from "@/components/Logo";
import PricingNav from "./PricingNav";
import GetStartedButton from "./GetStartedButton";
import CheckoutFinalizer from "./CheckoutFinalizer";

const features = [
  "Unlimited locations",
  "Unlimited cleaners",
  "Automated client notifications",
  "Job dispatch board",
  "Photo proof records",
  "Email support",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      {/* Top nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo href="/" size="md" />
        <PricingNav />
      </nav>

      {/* Page header */}
      <section className="mx-auto w-full max-w-xl px-4 pt-8 text-center sm:px-6 sm:pt-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Simple, flat pricing.
        </h1>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          One plan. Unlimited cleaners and locations. No per-seat fees.
        </p>
      </section>

      {/* Unified pricing card */}
      <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {/* Header + price */}
          <div className="px-7 pb-6 pt-7">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Growth plan
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight text-slate-900">$59</span>
              <span className="text-sm text-slate-500">/month</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Flat rate. No setup fees. Cancel anytime.
            </p>
          </div>

          {/* Divider */}
          <div className="mx-7 border-t border-slate-200"></div>

          {/* Features */}
          <div className="px-7 py-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            What&apos;s included
            </p>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 flex-shrink-0 text-emerald-500"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="mx-7 border-t border-slate-200"></div>

          {/* CTA + Risk-free */}
          <div className="px-7 pb-7 pt-6">
            <GetStartedButton />

            {/* Risk-free banner */}
            <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-center ring-1 ring-emerald-200">
              <p className="text-sm text-slate-700">
                <span className="font-bold text-emerald-700">Risk-free.</span>{" "}
                Cancel within your first month for a full refund.
              </p>
            </div>

            <Suspense fallback={null}>
              <CheckoutFinalizer />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
