"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Handles the return from Stripe Checkout (?checkout=success&session_id=...):
 * finalizes the subscription, then redirects to the dashboard. Isolated here
 * because it relies on useSearchParams — keeping it out of the marketing copy
 * so that copy stays server-rendered. Renders nothing unless finalizing.
 */
export default function CheckoutFinalizer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkoutStatus !== "success" || !sessionId) {
      return;
    }

    const finalizeCheckout = async () => {
      if (!supabase) {
        setError("Supabase environment variables are missing.");
        return;
      }

      setError(null);
      setIsFinalizing(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Please sign in before finalizing checkout.");
        setIsFinalizing(false);
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
        setError(result?.error ?? "Could not finalize subscription checkout.");
        setIsFinalizing(false);
        return;
      }

      router.replace("/dashboard");
    };

    void finalizeCheckout();
  }, [router, searchParams]);

  if (isFinalizing) {
    return (
      <p className="mt-3 text-center text-sm text-slate-600">Finalizing checkout...</p>
    );
  }

  if (error) {
    return (
      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  }

  return null;
}
