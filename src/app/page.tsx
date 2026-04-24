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
          <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-emerald-300"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
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
{/* How it works */}
<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl">
            Be up and running in under 10 minutes.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              step: "1",
              title: "Add your locations",
              body: "Set up every client location you clean. Offices, buildings, spaces — as many as you need.",
            },
            {
              step: "2",
              title: "Dispatch your crew",
              body: "Assign cleaners to jobs for tonight, tomorrow, or the whole week. Everyone knows where they're going.",
            },
            {
              step: "3",
              title: "Clients get proof, automatically",
              body: "When a cleaner marks a job complete, the client gets an instant email with a photo. You do nothing.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-emerald-200/15 bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8"
            >
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-sm font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-emerald-50">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-emerald-100/85">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl">
            Built for small and growing commercial cleaning companies.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-100/90">
            If any of this sounds like you, ProofClean will save you hours every week:
          </p>
        </div>
        <ul className="mx-auto mt-10 max-w-2xl space-y-4">
          {[
            "Running a crew of 3-50 cleaners across multiple client locations",
            "Tired of coordinating nightly jobs through group chats and spreadsheets",
            "Want clients to feel confident about the work without having to reassure them manually",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-emerald-200/15 bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span className="text-base text-emerald-50">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl">
            Frequently asked questions.
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {[
            {
              q: "Do I need to install anything?",
              a: "No. ProofClean runs in your browser. Your cleaners just need a phone to mark jobs complete.",
            },
            {
              q: "How do clients receive the proof?",
              a: "Email. When a job's marked complete, we send the client a simple confirmation with a timestamped photo of the finished space.",
            },
            {
              q: "How much does it cost?",
              a: "$59/month flat. Unlimited locations, unlimited cleaners, unlimited jobs. Cancel anytime.",
            },
            {
              q: "What if I only have a few locations?",
              a: "Still works great. ProofClean pays for itself in the time you save on dispatch and client updates.",
            },
            {
              q: "What happens to my data if I cancel?",
              a: "You can export everything before canceling. We don't lock you in.",
            },
            {
              q: "Is there a free trial?",
              a: "Not yet. But you can cancel any time with one click, and we'll refund your first month if it's not for you.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-emerald-200/15 bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-emerald-50 marker:hidden">
                <div className="flex items-center justify-between gap-4">
                  <span>{item.q}</span>
                  <span className="text-emerald-300 transition group-open:rotate-45">
                    +
                  </span>
                </div>
              </summary>
              <p className="mt-3 text-sm text-emerald-100/85">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      {/* Final CTA */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-emerald-200/15 bg-white/5 p-8 text-center ring-1 ring-white/10 backdrop-blur sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl">
          Organize your crew. Reassure your clients. Start today.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-emerald-100/90">
            Create your ProofClean account in minutes and start dispatching tonight.
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