"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import AppShell from "@/components/AppShell";
import ChangeEmailModal from "@/components/ChangeEmailModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ConfirmDialog from "@/components/ConfirmDialog";

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

const LOGO_BUCKET = "business-logos";
const MAX_LOGO_BYTES = 1024 * 1024;
const ACCEPTED_LOGO_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

function extensionForMimeType(mimeType: string): string | null {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

function storagePathFromLogoUrl(logoUrl: string): string | null {
  try {
    const marker = `/${LOGO_BUCKET}/`;
    const index = new URL(logoUrl).pathname.indexOf(marker);
    if (index === -1) return null;
    return new URL(logoUrl).pathname.slice(index + marker.length);
  } catch {
    return null;
  }
}

const TIMEZONES = [
  { value: "America/Edmonton", label: "Mountain Time — Edmonton" },
  { value: "America/Vancouver", label: "Pacific Time — Vancouver" },
  { value: "America/Winnipeg", label: "Central Time — Winnipeg" },
  { value: "America/Toronto", label: "Eastern Time — Toronto" },
  { value: "America/Halifax", label: "Atlantic Time — Halifax" },
  { value: "America/St_Johns", label: "Newfoundland Time — St. John's" },
  { value: "America/New_York", label: "Eastern Time — New York" },
  { value: "America/Chicago", label: "Central Time — Chicago" },
  { value: "America/Denver", label: "Mountain Time — Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/Phoenix", label: "Mountain Time — Phoenix (no DST)" },
  { value: "UTC", label: "UTC" },
];

type UserSettings = {
  user_id: string;
  business_name: string | null;
  sender_name: string | null;
  logo_url: string | null;
  timezone: string;
  email_notifications_enabled: boolean;
};

type Toast = { message: string; type: "success" | "error" };

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [timezone, setTimezone] = useState("America/Edmonton");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  const [savingField, setSavingField] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [removeLogoDialogOpen, setRemoveLogoDialogOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchSettings = useCallback(async () => {
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

    if (!isAuthChecked) setIsAuthChecked(true);

    const response = await fetch("/api/settings", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as
      | { settings?: UserSettings; email?: string; error?: string }
      | null;

    if (!response.ok || !result?.settings) {
      setLoadError(result?.error ?? "Could not load settings.");
      setIsLoading(false);
      return;
    }

    setSettings(result.settings);
    setEmail(result.email ?? user.email ?? "");
    setBusinessName(result.settings.business_name ?? "");
    setSenderName(result.settings.sender_name ?? "");
    setTimezone(result.settings.timezone ?? "America/Edmonton");
    setEmailNotificationsEnabled(result.settings.email_notifications_enabled ?? true);
    setIsLoading(false);
  }, [isAuthChecked, router]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const patchSettings = async (
    patch: Partial<
      Pick<
        UserSettings,
        | "business_name"
        | "sender_name"
        | "logo_url"
        | "timezone"
        | "email_notifications_enabled"
      >
    >,
    fieldKey: string,
    options?: { successMessage?: string },
  ) => {
    if (!supabase) return false;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return false;

    setSavingField(fieldKey);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    const result = (await response.json().catch(() => null)) as
      | { settings?: UserSettings; error?: string }
      | null;

    setSavingField(null);

    if (!response.ok || !result?.settings) {
      showToast(result?.error ?? "Could not save settings.", "error");
      return false;
    }

    setSettings(result.settings);
    showToast(options?.successMessage ?? "Settings saved.", "success");
    return true;
  };

  const deleteLogoFromStorage = async (logoUrl: string) => {
    if (!supabase) return;

    const storagePath = storagePathFromLogoUrl(logoUrl);
    if (!storagePath) return;

    const { error } = await supabase.storage.from(LOGO_BUCKET).remove([storagePath]);
    if (error) {
      console.error("Failed to delete logo from storage:", error);
    }
  };

  const handleLogoFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !supabase) return;

    if (!ACCEPTED_LOGO_MIME_TYPES.has(file.type)) {
      showToast("Please upload a PNG, JPG, SVG, or WebP image.", "error");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      showToast("Logo must be 1MB or smaller.", "error");
      return;
    }

    const extension = extensionForMimeType(file.type);
    if (!extension) {
      showToast("Please upload a PNG, JPG, SVG, or WebP image.", "error");
      return;
    }

    setIsUploadingLogo(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setIsUploadingLogo(false);
      showToast("Please sign in again.", "error");
      return;
    }

    const previousLogoUrl = settings?.logo_url ?? null;

    if (previousLogoUrl) {
      await deleteLogoFromStorage(previousLogoUrl);
    }

    const storagePath = `${session.user.id}/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingLogo(false);
      showToast(uploadError.message, "error");
      return;
    }

    const { data: publicUrlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    const ok = await patchSettings({ logo_url: publicUrl }, "logo_url", {
      successMessage: "Logo uploaded",
    });

    setIsUploadingLogo(false);

    if (!ok && previousLogoUrl) {
      await supabase.storage.from(LOGO_BUCKET).remove([storagePath]);
    }
  };

  const handleRemoveLogo = async () => {
    if (!supabase || !settings?.logo_url) return;

    setIsRemovingLogo(true);

    await deleteLogoFromStorage(settings.logo_url);

    const ok = await patchSettings({ logo_url: null }, "logo_url", {
      successMessage: "Logo removed",
    });

    setIsRemovingLogo(false);
    setRemoveLogoDialogOpen(false);

    if (!ok) {
      showToast("Could not remove logo.", "error");
    }
  };

  const handleBusinessNameBlur = async () => {
    const next = businessName.trim() || null;
    if (next === (settings?.business_name ?? null)) return;
    const ok = await patchSettings({ business_name: next }, "business_name");
    if (!ok) setBusinessName(settings?.business_name ?? "");
  };

  const handleSenderNameBlur = async () => {
    const next = senderName.trim() || null;
    if (next === (settings?.sender_name ?? null)) return;
    const ok = await patchSettings({ sender_name: next }, "sender_name");
    if (!ok) setSenderName(settings?.sender_name ?? "");
  };

  const handleTimezoneChange = async (value: string) => {
    setTimezone(value);
    if (value === settings?.timezone) return;
    const ok = await patchSettings({ timezone: value }, "timezone");
    if (!ok) setTimezone(settings?.timezone ?? "America/Edmonton");
  };

  const handleNotificationsToggle = async () => {
    const next = !emailNotificationsEnabled;
    setEmailNotificationsEnabled(next);
    const ok = await patchSettings(
      { email_notifications_enabled: next },
      "email_notifications_enabled",
    );
    if (!ok) setEmailNotificationsEnabled(settings?.email_notifications_enabled ?? true);
  };

  const handleManageSubscription = async () => {
    if (!supabase) return;

    setIsPortalLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setIsPortalLoading(false);
      showToast("Please sign in again.", "error");
      return;
    }

    const response = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const result = (await response.json().catch(() => null)) as
      | { url?: string; error?: string }
      | null;

    setIsPortalLoading(false);

    if (!response.ok || !result?.url) {
      showToast(result?.error ?? "Could not open billing portal.", "error");
      return;
    }

    window.location.href = result.url;
  };

  const handleDeleteAccount = async () => {
    if (!supabase) return;

    setIsDeletingAccount(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setIsDeletingAccount(false);
      showToast("Please sign in again.", "error");
      return;
    }

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const result = (await response.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null;

    if (!response.ok) {
      setIsDeletingAccount(false);
      showToast(result?.error ?? "Could not delete account.", "error");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/account-deleted");
  };

  if (!isAuthChecked && isLoading) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Manage your account, business details, and preferences.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading settings...
        </div>
      ) : (
        <div className="space-y-6">
          <SettingsCard
            title="Profile"
            description="Your login credentials and account identity."
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-900">{email}</p>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Change email
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </label>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Change password
              </button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Business"
            description="How your company appears on proof emails to clients."
          >
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              Changes save automatically.
            </p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => void handleLogoFileSelect(event)}
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Business logo
              </label>
              {settings?.logo_url ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg border border-slate-200 bg-white p-4">
                    {isUploadingLogo ? (
                      <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" aria-hidden />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.logo_url}
                        alt="Business logo"
                        className="mx-auto max-h-32 max-w-[200px] object-contain"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo || isRemovingLogo}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveLogoDialogOpen(true)}
                      disabled={isUploadingLogo || isRemovingLogo}
                      className="px-2 py-2 text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="flex min-h-[120px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-[#f7fafa] px-4 py-8 transition hover:border-emerald-400 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" aria-hidden />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-500" aria-hidden />
                      <span className="mt-2 text-sm font-medium text-slate-700">
                        Click to upload logo
                      </span>
                      <span className="mt-1 text-xs text-slate-500">
                        PNG, JPG, SVG, or WebP. Max 1MB.
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div>
              <label
                htmlFor="business-name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Business name
              </label>
              <input
                id="business-name"
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                onBlur={() => void handleBusinessNameBlur()}
                disabled={savingField === "business_name"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                placeholder="Acme Commercial Cleaning"
              />
            </div>
            <div>
              <label
                htmlFor="sender-name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Sender name on proof emails
              </label>
              <input
                id="sender-name"
                type="text"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                onBlur={() => void handleSenderNameBlur()}
                disabled={savingField === "sender_name"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                placeholder="Acme Cleaning Team"
              />
              <p className="mt-2 text-xs text-slate-500">
                This name appears as the &apos;from&apos; name on photo proof emails sent to
                your clients.
              </p>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Preferences"
            description="Timezone and notification preferences for your account."
          >
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              Changes save automatically.
            </p>
            <div>
              <label
                htmlFor="timezone"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(event) => void handleTimezoneChange(event.target.value)}
                disabled={savingField === "timezone"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Email notifications</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Email me about subscription renewals, payment issues, and account changes
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotificationsEnabled}
                disabled={savingField === "email_notifications_enabled"}
                onClick={() => void handleNotificationsToggle()}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 ${
                  emailNotificationsEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotificationsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Billing"
            description="Manage your ProofClean subscription and payment method."
          >
            <button
              type="button"
              onClick={() => void handleManageSubscription()}
              disabled={isPortalLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPortalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Opening portal...
                </>
              ) : (
                "Manage subscription"
              )}
            </button>
          </SettingsCard>

          <SettingsCard
            title="Danger Zone"
            description="Permanently delete your account and all associated data."
          >
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeletingAccount}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Delete account
            </button>
          </SettingsCard>
        </div>
      )}

      <ChangeEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        currentEmail={email}
        onSuccess={(message) => showToast(message, "success")}
        onError={(message) => showToast(message, "error")}
      />

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userEmail={email}
        onSuccess={(message) => showToast(message, "success")}
        onError={(message) => showToast(message, "error")}
      />

      <ConfirmDialog
        open={removeLogoDialogOpen}
        onClose={() => setRemoveLogoDialogOpen(false)}
        onConfirm={() => void handleRemoveLogo()}
        title="Remove logo"
        message="Remove logo? You can upload a new one anytime."
        confirmLabel="Remove"
        destructive
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
        title="Delete account"
        message="This will permanently delete your account, cancel your subscription, and stop all your cleaner share links from working. This cannot be undone. Type DELETE to confirm."
        confirmLabel="Delete account"
        destructive
        confirmTextRequired="DELETE"
        confirmTextLabel='Type "DELETE" to confirm'
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 z-50 flex max-w-[min(100%-2rem,28rem)] -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          ) : null}
          {toast.message}
        </div>
      ) : null}
    </AppShell>
  );
}
