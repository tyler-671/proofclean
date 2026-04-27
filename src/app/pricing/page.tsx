"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const features = [
  "Unlimited locations",
  "Unlimited cleaners",
  "Automated client notifications",
  "Job dispatch board",
  "Photo proof records",
];

const valueProps = [
  {
    title: "Everything in one place",
    body: "See every job, every cleaner, every location on one dashboard. Finally ditch the spreadsheets.",
  },
  {
    title: "Dispatch in seconds",
    body: "Assign jobs and locations to cleaners in one click. Everyone knows what they're doing tonight.",
  },
  {
    title: "Automated photo proof",
    body: "When a job's marked complete, your client gets an instant email confirmation with a photo.",
  },
];

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isFinalizingCheckout, setIsFinalizingCheckout] = useState(false);

  const onSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/");
  };

  const onGetStarted = async () => {
    setCheckoutError(null);
    setIsRedirecting(true);

    try {
      if (!supabase) {
        setCheckoutError("Supabase environment variables are missing.");
        setIsRedirecting(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCheckoutError("Please sign in before starting checkout.");
        setIsRedirecting(false);
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !result?.url) {
        setCheckoutError(result?.error ?? "Could not start checkout. Please try again.");
        setIsRedirecting(false);
        return;
      }

      window.location.href = result.url;
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unexpected error starting checkout.",
      );
      setIsRedirecting(false);
    }
  };

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkoutStatus !== "success" || !sessionId) {
      return;
    }

    const finalizeCheckout = async () => {
      if (!supabase) {
        setCheckoutError("Supabase environment variables are missing.");
        return;
      }

      setCheckoutError(null);
      setIsFinalizingCheckout(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCheckoutError("Please sign in before finalizing checkout.");
        setIsFinalizingCheckout(false);
        return;
      }

      const response = await fetch("/api/checkout/success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setCheckoutError(result?.error ?? "Could not finalize subscription checkout.");
        setIsFinalizingCheckout(false);
        return;
      }

      router.replace("/dashboard");
    };

    void finalizeCheckout();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      {/* Top nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            ProofClean
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
        >
          Sign out
        </button>
      </nav>

      {/* Pricing card */}
      <section className="mx-auto w-full max-w-xl px-4 pb-12 pt-8 sm:px-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Growth plan
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-slate-900">$59</span>
            <span className="pb-1 text-base font-medium text-slate-500">/month</span>
          </div>

          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                <div className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-emerald-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 text-emerald-600"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void onGetStarted()}
            disabled={isRedirecting || isFinalizingCheckout}
            className="mt-10 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRedirecting
              ? "Redirecting..."
              : isFinalizingCheckout
                ? "Finalizing checkout..."
                : "Get started"}
          </button>
          {checkoutError ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {checkoutError}
            </p>
          ) : null}
        </div>

        {/* Value props (reminder before paying) */}
        <section className="mx-auto mt-10 flex flex-col gap-4">
          {valueProps.map((prop) => (
            <div key={prop.title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-emerald-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-emerald-600"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                {prop.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{prop.body}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7fafa]" />}>
      <PricingContent />
    </Suspense>
  );
}