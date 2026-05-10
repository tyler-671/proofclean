"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Copy, Check, Power, RefreshCw, Trash2, MoreHorizontal } from "lucide-react";
import TopNav from "@/components/TopNav";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type Cleaner = {
  id: string;
  name: string;
  phone: string | null;
  access_token: string;
  active: boolean;
};

function sortCleaners(list: Cleaner[]) {
  return [...list].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function formatPhone(phone: string | null) {
  if (!phone) return phone;

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

export default function CleanersPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCleanerId, setDeletingCleanerId] = useState<string | null>(null);
  const [togglingCleanerId, setTogglingCleanerId] = useState<string | null>(null);
  const [regeneratingCleanerId, setRegeneratingCleanerId] = useState<string | null>(null);
  const [copiedCleanerId, setCopiedCleanerId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // Close the ••• menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cleaner-menu]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const fetchCleaners = useCallback(async () => {
    if (!supabase) {
      setLoadError("Supabase environment variables are missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    const user = session.user;

    if (!isAuthChecked) setIsAuthChecked(true);

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      setLoadError(subscriptionError.message);
      setIsLoading(false);
      return;
    }

    if (subscription?.status !== "active") {
      router.replace("/pricing");
      return;
    }

    const { data, error } = await supabase
      .from("cleaners")
      .select("id, name, phone, access_token, active")
      .eq("user_id", user.id);

    if (error) {
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    setCleaners(sortCleaners((data as Cleaner[]) ?? []));
    setIsLoading(false);
  }, [router, isAuthChecked]);

  useEffect(() => {
    void fetchCleaners();
  }, [fetchCleaners]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setFormError("Supabase environment variables are missing.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFormError(userError?.message ?? "Could not verify authenticated user.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("cleaners").insert({
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
    });

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setName("");
    setPhone("");
    setIsSubmitting(false);
    await fetchCleaners();
  };

  const onCopyShareMessage = async (cleaner: Cleaner) => {
    const message = `Hi ${cleaner.name}, here's your ProofClean link for marking jobs complete:
https://proofclean.ca/crew/${cleaner.access_token}

⚠️ This link is personal to you. Do not share it with anyone —
it gives access to your assigned jobs.`;

    try {
      await navigator.clipboard.writeText(message);
      setCopiedCleanerId(cleaner.id);
      window.setTimeout(() => {
        setCopiedCleanerId((current) => (current === cleaner.id ? null : current));
      }, 1500);
    } catch {
      setLoadError("Could not copy message. Please try again.");
    }
  };

  const onToggleActive = async (cleaner: Cleaner) => {
    if (!supabase) return;

    if (cleaner.active) {
      const { count, error: countError } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("cleaner_id", cleaner.id)
        .neq("status", "complete");

      if (countError) {
        setLoadError(countError.message);
        return;
      }

      const pendingCount = count ?? 0;
      const confirmMessage =
        pendingCount > 0
          ? `${cleaner.name} has ${pendingCount} pending job(s). Deactivating will prevent them from accessing those jobs. Owner will need to reassign these jobs to another cleaner. Continue?`
          : `Deactivate ${cleaner.name}? Their link will stop working immediately.`;

      if (!window.confirm(confirmMessage)) return;
    }

    setTogglingCleanerId(cleaner.id);

    const { error } = await supabase
      .from("cleaners")
      .update({ active: !cleaner.active })
      .eq("id", cleaner.id);

    if (error) {
      setLoadError(error.message);
      setTogglingCleanerId(null);
      return;
    }

    setTogglingCleanerId(null);
    await fetchCleaners();
  };

  const onRegenerateLink = async (cleaner: Cleaner) => {
    if (!supabase) return;

    const confirmed = window.confirm(
      "This will invalidate the old link. The cleaner will need the new link to access their jobs. Continue?",
    );
    if (!confirmed) return;

    setRegeneratingCleanerId(cleaner.id);
    const accessToken = crypto.randomUUID().replace(/-/g, "");

    const { error } = await supabase
      .from("cleaners")
      .update({ access_token: accessToken })
      .eq("id", cleaner.id);

    if (error) {
      setLoadError(error.message);
      setRegeneratingCleanerId(null);
      return;
    }

    setRegeneratingCleanerId(null);
    await fetchCleaners();
  };

  const onDelete = async (cleaner: Cleaner) => {
    if (!supabase) return;

    const confirmed = window.confirm(
      `Delete ${cleaner.name}? This cannot be undone. Their job history will be preserved but unassigned.`,
    );
    if (!confirmed) return;

    setDeletingCleanerId(cleaner.id);

    const { error } = await supabase.from("cleaners").delete().eq("id", cleaner.id);

    if (error) {
      setLoadError(error.message);
      setDeletingCleanerId(null);
      return;
    }

    setDeletingCleanerId(null);
    await fetchCleaners();
  };

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <div className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <TopNav />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Cleaners
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Manage your cleaning crew and secure job links.
            </p>
          </div>
        </section>

        <form onSubmit={onSubmit} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-sm font-semibold text-slate-900">Add cleaner</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Jordan Lee"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Phone (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          {formError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Adding..." : "+ Add Cleaner"}
            </button>
          </div>
        </form>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600">
              Loading cleaners...
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
              Could not load cleaners: {loadError}
            </div>
          ) : cleaners.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No cleaners yet. Add your first cleaner above to start dispatching.
              </p>
            </div>
          ) : (
            cleaners.map((cleaner) => (
              <div
                key={cleaner.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                      {cleaner.name}
                    </p>
                    {cleaner.phone ? (
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {formatPhone(cleaner.phone)}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm font-medium text-slate-400">No phone provided</p>
                    )}
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      cleaner.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {cleaner.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                {/* Primary action: Copy message */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => void onCopyShareMessage(cleaner)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
                  >
                    {copiedCleanerId === cleaner.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        {`Copy message to send to ${cleaner.name}`}
                      </>
                    )}
                  </button>
                  <span className="mt-1 text-xs text-gray-500">
                    Includes their access link and a security warning.
                  </span>
                </div>

                {/* Secondary action: Activate/Deactivate */}
                <button
                  type="button"
                  onClick={() => void onToggleActive(cleaner)}
                  disabled={togglingCleanerId === cleaner.id}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    cleaner.active
                      ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      : "border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  <Power className="h-4 w-4" />
                  {togglingCleanerId === cleaner.id
                    ? "Saving..."
                    : cleaner.active
                    ? "Deactivate"
                    : "Activate"}
                </button>

                {/* Overflow menu: Regenerate + Delete */}
                <div className="relative" data-cleaner-menu>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === cleaner.id}
                    onClick={() =>
                      setOpenMenuId((prev) =>
                        prev === cleaner.id ? null : cleaner.id
                      )
                    }
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {openMenuId === cleaner.id && (
                    <div
                      role="menu"
                      className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuId(null);
                          void onRegenerateLink(cleaner);
                        }}
                        disabled={regeneratingCleanerId === cleaner.id}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {regeneratingCleanerId === cleaner.id
                          ? "Regenerating..."
                          : "Regenerate link"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuId(null);
                          void onDelete(cleaner);
                        }}
                        disabled={deletingCleanerId === cleaner.id}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingCleanerId === cleaner.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
