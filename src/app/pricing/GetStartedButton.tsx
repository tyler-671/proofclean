"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * The "Get started" checkout action. Starts a Stripe Checkout session for the
 * signed-in user. Rendered on the server for its initial HTML (no
 * useSearchParams here), so the button stays in the server-rendered output.
 */
export default function GetStartedButton() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
        // Cold prospects have no account yet. Send them to sign up instead of
        // dead-ending them at the buy moment. The signup flow redirects back
        // to /pricing once the account exists, continuing them to checkout.
        router.push("/signup");
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

  return (
    <>
      <button
        type="button"
        onClick={() => void onGetStarted()}
        disabled={isRedirecting}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isRedirecting ? "Redirecting..." : "Get started"}
      </button>

      {checkoutError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {checkoutError}
        </p>
      ) : null}
    </>
  );
}
