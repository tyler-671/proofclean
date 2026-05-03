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

const howItWorks = [
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
];

const audience = [
  "Running a crew of 3-50 cleaners across multiple client locations",
  "Tired of coordinating nightly jobs through group chats and spreadsheets",
  "Want clients to feel confident about the work without having to reassure them manually",
];

const faqs = [
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
];

const Logo = ({ size = "default" }: { size?: "default" | "small" }) => {
  const dim = size === "small" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "small" ? 14 : 18;
  return (
    <div className={`grid ${dim} place-items-center rounded-xl bg-emerald-500`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        width={iconSize}
        height={iconSize}
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );
};

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
    return <main className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <main className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      {/* Top nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo size="small" />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            ProofClean
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-slate-700 transition hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-600"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-12 text-center sm:px-6 sm:pt-20">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        Crew dispatch, organized.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
          Plan jobs, assign cleaners, and see your whole operation at a glance.
        </p>
        <h2 className="mt-12 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Automated client confirmation.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
          When the work is done, your client gets a photo confirmation in their inbox — automatically.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 sm:w-auto"
          >
            Start your ProofClean account
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-slate-700 transition hover:text-slate-900 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {valueProps.map((prop) => (
              <div
                key={prop.title}
                className="rounded-2xl bg-[#f7fafa] p-6 sm:p-8"
              >
                <div className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-emerald-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-emerald-600"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {prop.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">{prop.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-emerald-950 py-20 text-center">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
            Simple pricing
          </p>
          <div className="mt-4 flex items-end justify-center gap-2">
            <span className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
              $59
            </span>
            <span className="pb-2 text-base font-medium text-emerald-100/80">
              /month
            </span>
          </div>
          <p className="mt-4 text-sm text-emerald-100/85 sm:text-base">
            Flat rate. No setup fees. Cancel anytime.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-300"
          >
            Start your ProofClean account
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Be up and running in under 10 minutes.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {howItWorks.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
              >
                <div className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-[#f7fafa] py-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for small and growing commercial cleaning companies.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
              If any of this sounds like you, ProofClean will save you hours every week:
            </p>
          </div>
          <ul className="mx-auto mt-10 max-w-2xl space-y-4">
            {audience.map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-emerald-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 text-emerald-600"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-base text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Frequently asked questions.
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer list-none marker:hidden">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base font-semibold text-slate-900">
                      {item.q}
                    </span>
                    <span className="text-xl font-semibold text-emerald-600 transition group-open:rotate-45">
                      +
                    </span>
                  </div>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-emerald-950 py-20">
        <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Organize your crew. Reassure your clients. Start today.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-emerald-100/85 sm:text-lg">
            Create your ProofClean account in minutes and start dispatching tonight.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-300"
          >
            Start your ProofClean account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} ProofClean. All rights reserved.
        </p>
      </footer>
    </main>
  );
}