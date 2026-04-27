"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setStatusType("error");
      setStatusMessage("Supabase environment variables are missing.");
      return;
    }

    if (password.length < 8) {
      setStatusType("error");
      setStatusMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatusType("error");
      setStatusMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setStatusType(null);
    setStatusMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatusType("error");
      setStatusMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      setIsSubmitting(false);
      router.replace("/pricing");
      return;
    }

    setIsSubmitting(false);
    setStatusType("success");
    setStatusMessage(
      "Account created! Check your inbox to confirm your email, then sign in.",
    );
  };

  return (
    <div className="min-h-screen bg-[#f7fafa] px-4 py-6 font-[family-name:var(--font-geist-sans)] sm:px-6">
      <nav className="mx-auto w-full max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-3 transition hover:opacity-80">
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
      </nav>

      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
            <header className="mb-8 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Create your account
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Start running your cleaning crew with ProofClean
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Re-enter your password"
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
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-sm text-slate-700">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}