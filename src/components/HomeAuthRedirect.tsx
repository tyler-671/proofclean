"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Client-only side effect: if the visitor is already signed in with an active
 * subscription, send them to the dashboard. Renders nothing so the marketing
 * homepage HTML is server-rendered for crawlers and link previews.
 */
export default function HomeAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (subscription?.status === "active") {
          router.replace("/dashboard");
        }
      }
    };

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return null;
}
