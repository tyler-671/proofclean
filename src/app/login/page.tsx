"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const syncAutofilledValues = () => {
    const emailValue = emailInputRef.current?.value ?? "";
    const passwordValue = passwordInputRef.current?.value ?? "";

    if (emailValue !== email) {
      setEmail(emailValue);
    }

    if (passwordValue !== password) {
      setPassword(passwordValue);
    }
  };

  useEffect(() => {
    syncAutofilledValues();
    const timeoutId = window.setTimeout(syncAutofilledValues, 100);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    syncAutofilledValues();

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? email).trim();
    const submittedPassword = String(formData.get("password") ?? password);

    if (!supabase) {
      setStatusType("error");
      setStatusMessage("Supabase environment variables are missing.");
      return;
    }

    setIsSubmitting(true);
    setStatusType(null);
    setStatusMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password: submittedPassword,
    });

    if (error) {
      setStatusType("error");
      setStatusMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatusType("error");
      setStatusMessage(userError?.message ?? "Could not verify logged-in user.");
      setIsSubmitting(false);
      return;
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      setStatusType("error");
      setStatusMessage(subscriptionError.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace(subscription?.status === "active" ? "/dashboard" : "/pricing");
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
                Welcome back
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Sign in to your ProofClean account
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
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onInput={syncAutofilledValues}
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
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onInput={syncAutofilledValues}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Enter your password"
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
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              New to ProofClean?{" "}
              <Link
                href="/signup"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}