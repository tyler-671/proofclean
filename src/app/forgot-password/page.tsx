"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
        },
      })
    : null;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setStatusType("error");
      setStatusMessage("Supabase environment variables are missing.");
      return;
    }

    setIsSubmitting(true);
    setStatusType(null);
    setStatusMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsSubmitting(false);

    if (error) {
      setStatusType("error");
      setStatusMessage(error.message);
      return;
    }

    setIsSubmitted(true);
    setStatusType("success");
    setStatusMessage("Check your inbox for a password reset link.");
  };

  return (
    <div className="min-h-screen bg-[#f7fafa] px-4 py-6 font-[family-name:var(--font-geist-sans)] sm:px-6">
      <nav className="mx-auto w-full max-w-6xl">
        <Link href="/" className="transition hover:opacity-80">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 220 40"
            className="h-10 w-auto"
            aria-label="ProofClean"
            role="img"
          >
            <text
              x="0"
              y="30"
              fontFamily="var(--font-geist-sans), 'Lexend Deca', sans-serif"
              fontSize="28"
              fontWeight="700"
              fill="#111827"
            >
              Proof
            </text>
            <text
              x="76"
              y="30"
              fontFamily="var(--font-geist-sans), 'Lexend Deca', sans-serif"
              fontSize="28"
              fontWeight="700"
              fill="#10b981"
            >
              Clean
            </text>
          </svg>
        </Link>
      </nav>

      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
            <header className="mb-8 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Reset your password
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSubmitted}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="you@company.com"
                />
              </div>
              {statusMessage ? (
                <p
                  className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                    statusType === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting || isSubmitted}
                className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              <Link
                href="/login"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
