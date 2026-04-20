"use client";

import { Suspense, useEffect, useState } from "react";
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

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isFinalizingCheckout, setIsFinalizingCheckout] = useState(false);

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
    <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 px-4 py-10 font-[family-name:var(--font-geist-sans)] text-white sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-10 flex items-center justify-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-300/20">
            <span className="text-sm font-bold tracking-tight text-emerald-100">PC</span>
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-emerald-50">ProofClean</p>
            <p className="text-xs font-medium text-emerald-200/80">Simple pricing</p>
          </div>
        </header>

        <section className="mx-auto max-w-xl rounded-3xl border border-emerald-200/15 bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100/80">
            Growth plan
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-emerald-50">$59</span>
            <span className="pb-1 text-base font-medium text-emerald-100/80">/month</span>
          </div>

          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-emerald-50">
                <span className="text-emerald-300">âœ“</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void onGetStarted()}
            disabled={isRedirecting || isFinalizingCheckout}
            className="mt-10 w-full rounded-xl bg-emerald-300/20 px-4 py-3 text-sm font-semibold text-emerald-50 ring-1 ring-emerald-300/35 transition hover:bg-emerald-300/30"
          >
            {isRedirecting
              ? "Redirecting..."
              : isFinalizingCheckout
                ? "Finalizing checkout..."
                : "Get started"}
          </button>
          {checkoutError ? (
            <p className="mt-3 text-sm font-medium text-red-100">{checkoutError}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900" />}>
      <PricingContent />
    </Suspense>
  );
}