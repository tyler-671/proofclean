"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PasswordStrengthChecklist, {
  isPasswordStrong,
} from "@/components/PasswordStrengthChecklist";

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

const PASSWORD_UPDATED_KEY = "proofclean_password_updated";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false);
      return;
    }

    let isMounted = true;

    const verifySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    };

    void verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setHasValidSession(true);
        setIsCheckingSession(false);
        return;
      }

      if (event === "INITIAL_SESSION" && session) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    });

    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;

      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;

        setHasValidSession(Boolean(session));
        setIsCheckingSession(false);
      });
    }, 500);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    if (!supabase) {
      setStatusMessage("Supabase environment variables are missing.");
      return;
    }

    if (!isPasswordStrong(password)) {
      setStatusMessage("Password doesn't meet all requirements");
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    sessionStorage.setItem(PASSWORD_UPDATED_KEY, "1");
    router.replace("/dashboard");
  };

  const invalidLinkMessage =
    "This reset link is invalid or expired. Please request a new one.";

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
                Set a new password
              </p>
            </header>

            {isCheckingSession ? (
              <p className="text-center text-sm font-medium text-slate-600">
                Verifying reset link...
              </p>
            ) : !hasValidSession ? (
              <div className="space-y-5">
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {invalidLinkMessage}
                </p>
                <p className="text-center text-sm text-slate-600">
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Request a new reset link
                  </Link>
                </p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    New password
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
                    placeholder="Create a strong password"
                  />
                  <PasswordStrengthChecklist password={password} />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm new password
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
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {statusMessage}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmitting || !isPasswordStrong(password)}
                  className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
