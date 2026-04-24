"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

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

export default function LandingPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (!supabase) {
        if (isMounted) setIsCheckingAuth(false);
        return;
      }

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
            return;
          }
      }

      setIsCheckingAuth(false);
    };

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900" />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 font-[family-name:var(--font-geist-sans)] text-white">
      {/* Top nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-300/20">
            <span className="text-sm font-bold tracking-tight text-emerald-100">PC</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-emerald-50">
            ProofClean
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-emerald-100 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-300/20 px-4 py-2 text-emerald-50 ring-1 ring-emerald-300/35 transition hover:bg-emerald-300/30"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-emerald-50 sm:text-5xl lg:text-6xl">
            Dispatch your team.
            <br />
            Update clients automatically.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100/90 sm:text-xl">
            Dispatch jobs, organize your crew, and send clients automated photo
            proof — all in one simple dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-emerald-300/20 px-6 py-3 text-sm font-semibold text-emerald-50 ring-1 ring-emerald-300/35 transition hover:bg-emerald-300/30 sm:w-auto"
            >
              Start your ProofClean account
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:text-white sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {valueProps.map((prop) => (
            <div
              key={prop.title}
              className="rounded-3xl border border-emerald-200/15 bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8"
            >
              <h3 className="text-lg font-semibold tracking-tight text-emerald-50">
                {prop.title}
              </h3>
              <p className="mt-3 text-sm text-emerald-100/85">{prop.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-emerald-200/15 bg-white/5 p-8 text-center ring-1 ring-white/10 backdrop-blur sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100/80">
            Simple pricing
          </p>
          <div className="mt-4 flex items-end justify-center gap-2">
            <span className="text-5xl font-bold tracking-tight text-emerald-50">
              $59
            </span>
            <span className="pb-1 text-base font-medium text-emerald-100/80">
              /month
            </span>
          </div>
          <p className="mt-4 text-sm text-emerald-100/85">
            Flat rate. No setup fees. Cancel anytime.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-emerald-300/20 px-6 py-3 text-sm font-semibold text-emerald-50 ring-1 ring-emerald-300/35 transition hover:bg-emerald-300/30"
          >
            Start your ProofClean account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-6xl px-4 py-10 text-center text-sm text-emerald-100/60 sm:px-6">
        <p>© {new Date().getFullYear()} ProofClean. All rights reserved.</p>
      </footer>
    </main>
  );
}