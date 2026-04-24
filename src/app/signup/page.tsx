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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 px-4 py-12 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-black/25 ring-1 ring-black/5 sm:p-10">
          <header className="mb-8 text-center">
            <p className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
              ProofClean
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-800/85">
              Create your account
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
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-gray-700"
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
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-900/20"
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
              className="w-full rounded-lg bg-emerald-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-950 focus:ring-offset-2"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/"
              className="font-semibold text-emerald-800 hover:text-emerald-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}