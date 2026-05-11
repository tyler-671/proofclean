"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Lock,
  StickyNote,
} from "lucide-react";

type CrewJob = {
  id: string;
  locationName: string;
  clientName: string | null;
  status: string;
  jobDate: string | null;
  notes: string | null;
};

function formatJobDate(isoDate: string | null): string {
  if (!isoDate) return "Date not set";
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  const local = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(local);
}

function statusPillClass(status: string): string {
  if (status === "in_progress") {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-slate-100 text-slate-700";
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In progress";
  if (status === "pending") return "Pending";
  return status;
}

export default function CrewPage() {
  const params = useParams();
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleanerName, setCleanerName] = useState<string | null>(null);
  const [jobs, setJobs] = useState<CrewJob[]>([]);

  useEffect(() => {
    if (!token?.trim()) {
      setError("Link not found. Contact your manager.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (isBackground = false) => {
      if (!isBackground) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const res = await fetch(`/api/crew/${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          cleaner?: { name: string };
          jobs?: CrewJob[];
        };

        if (cancelled) return;

        if (res.ok) {
          setCleanerName(data.cleaner?.name ?? null);
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
          return;
        }

        if (res.status === 403) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "This link is no longer active. Contact your manager.",
          );
          return;
        }

        if (res.status === 404) {
          setError("Link not found. Contact your manager.");
          return;
        }

        setError("Couldn't load jobs. Try again.");
      } catch {
        if (!cancelled) {
          setError("Couldn't load jobs. Try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    // A — Auto-refresh every 60 seconds
    const intervalId = window.setInterval(() => {
      void load(true);
    }, 60000);

    // D — Refresh when the page becomes visible again (e.g., user unlocks phone)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 font-[family-name:var(--font-geist-sans)]">
        <p className="animate-pulse text-base text-slate-500">Loading your jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 font-[family-name:var(--font-geist-sans)]">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" aria-hidden />
          <h1 className="text-xl font-semibold text-slate-900">Hmm.</h1>
          <p className="mt-2 text-base text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-geist-sans)] text-slate-900">
      <header className="bg-emerald-500 py-6 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 shadow-sm">
            <Check className="h-6 w-6 text-white" strokeWidth={3} aria-hidden />
          </div>
          <p className="text-lg font-semibold tracking-tight">ProofClean</p>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Hi{cleanerName ? ` ${cleanerName}` : ""}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {jobs.length > 0
            ? "Here are your upcoming jobs."
            : "No jobs assigned to you right now."}
        </p>
      </section>

      <div className="mx-auto my-3 flex max-w-[calc(28rem-2rem)] items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <Lock className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="text-sm text-amber-800">
          This is your personal link. Don&apos;t share it with anyone.
        </p>
      </div>

      <div className="mx-auto max-w-md px-4 pb-8">
        {jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  {job.clientName ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {job.clientName}
                    </p>
                  ) : null}
                  <p className="text-lg font-semibold text-slate-900">{job.locationName}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{formatJobDate(job.jobDate)}</span>
                  </div>
                  {job.notes?.trim() ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="flex items-start gap-2">
                        <StickyNote
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden
                        />
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{job.notes}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex justify-end">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(job.status)}`}
                    >
                      {statusLabel(job.status)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-600"
                    onClick={() => console.log("Mark complete clicked", job.id)}
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                    Mark Complete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-2 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">Nothing scheduled right now.</p>
            <p className="mt-2 max-w-sm text-base text-slate-600">
              Check back later or contact your manager if you think this is wrong.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
