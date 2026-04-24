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
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 px-4 py-6 font-[family-name:var(--font-geist-sans)] sm:px-6">
      <nav className="mx-auto w-full max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-3 transition hover:opacity-80">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-300/20">
            <span className="text-sm font-bold tracking-tight text-emerald-100">PC</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-emerald-50">
            ProofClean
          </span>
        </Link>
      </nav>
      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-black/25 ring-1 ring-black/5 sm:p-10">
            <header className="mb-8 text-center">
              <p className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
                ProofClean
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-800/85">
                Commercial Janitorial Platform
              </p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
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
                className="w-full rounded-lg bg-emerald-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-950 focus:ring-offset-2"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-600">
              New to ProofClean?{" "}
              <Link
                href="/signup"
                className="font-semibold text-emerald-800 hover:text-emerald-700"
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