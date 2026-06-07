"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, X } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type ChangeEmailModalProps = {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export default function ChangeEmailModal({
  open,
  onClose,
  currentEmail,
  onSuccess,
  onError,
}: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setNewEmail("");
    setStatusMessage(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      onError("Supabase is not configured.");
      return;
    }

    const trimmed = newEmail.trim();
    if (!trimmed) {
      setStatusMessage("Please enter a new email address.");
      return;
    }

    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setStatusMessage("That is already your current email address.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const { error } = await supabase.auth.updateUser({ email: trimmed });

    setIsSubmitting(false);

    if (error) {
      onError(error.message);
      return;
    }

    setStatusMessage(
      "Verification email sent. Check your inbox to confirm the new address.",
    );
    onSuccess("Verification email sent. Check your inbox to confirm the new address.");
    setNewEmail("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-[family-name:var(--font-geist-sans)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-email-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="change-email-title" className="text-lg font-semibold text-slate-900">
            Change email
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Current email: <span className="font-medium text-slate-900">{currentEmail}</span>
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="new-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              New email
            </label>
            <input
              id="new-email"
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="you@company.com"
            />
          </div>

          {statusMessage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {statusMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending...
                </>
              ) : (
                "Update email"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
