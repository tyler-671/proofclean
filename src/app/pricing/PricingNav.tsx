"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const linkClass =
  "rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900";

/**
 * Auth-aware top-right nav action. Defaults to "Log in" so a logged-out visitor
 * (or a crawler) never sees a meaningless "Sign out"; switches to "Sign out"
 * only once a session is confirmed.
 */
export default function PricingNav() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) return;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setIsSignedIn(Boolean(session?.user));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isSignedIn) {
    const onSignOut = async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      router.replace("/");
    };

    return (
      <button type="button" onClick={() => void onSignOut()} className={linkClass}>
        Sign out
      </button>
    );
  }

  return (
    <Link href="/login" className={linkClass}>
      Log in
    </Link>
  );
}
