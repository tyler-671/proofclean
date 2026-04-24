"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type JobStatus = "Complete" | "In progress" | "Pending";
type DbJobStatus = "pending" | "in_progress" | "complete";

type JobRow = {
  id: string;
  location_name: string;
  cleaner_name: string;
  status: DbJobStatus;
  job_date: string | null;
};

type DashboardJob = {
  id: string;
  location: string;
  cleaner: string;
  status: JobStatus;
  jobDate: string | null;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

export default function DashboardPage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [cleanerName, setCleanerName] = useState("");
  const [jobStatus, setJobStatus] = useState<DbJobStatus>("pending");
  const [jobDate, setJobDate] = useState(getTodayDateInputValue);
  const [addJobError, setAddJobError] = useState<string | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [openStatusMenuJobId, setOpenStatusMenuJobId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const inProgressJobs = jobs.filter((job) => job.status === "In progress").length;
    const completeJobs = jobs.filter((job) => job.status === "Complete").length;

    return [
      { label: "Locations tonight", value: String(totalJobs) },
      { label: "Cleaners active", value: String(inProgressJobs) },
      { label: "Jobs complete", value: String(completeJobs) },
      { label: "Clients notified", value: String(completeJobs) },
    ];
  }, [jobs]);

  const fetchJobs = useCallback(async () => {
    if (!supabase) {
      setJobsError("Supabase environment variables are missing.");
      setIsLoadingJobs(false);
      return;
    }

    setIsLoadingJobs(true);
    setJobsError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setJobsError(userError?.message ?? "Could not load authenticated user.");
      setIsLoadingJobs(false);
      return;
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      setJobsError(subscriptionError.message);
      setIsLoadingJobs(false);
      return;
    }

    if (subscription?.status !== "active") {
      router.replace("/pricing");
      setIsLoadingJobs(false);
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("id, location_name, cleaner_name, status, job_date")
      .eq("user_id", user.id)
      .order("job_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setJobsError(error.message);
      setIsLoadingJobs(false);
      return;
    }

    const mappedJobs: DashboardJob[] = (data as JobRow[]).map((job) => ({
      id: job.id,
      location: job.location_name,
      cleaner: job.cleaner_name,
      jobDate: job.job_date,
      status:
        job.status === "complete"
          ? "Complete"
          : job.status === "in_progress"
            ? "In progress"
            : "Pending",
    }));

    setJobs(mappedJobs);
    setIsLoadingJobs(false);
  }, [router]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const onSignOut = async () => {
    if (!supabase) return;
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const onAddJobSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setAddJobError("Supabase environment variables are missing.");
      return;
    }

    setIsSubmittingJob(true);
    setAddJobError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setAddJobError(userError?.message ?? "Could not verify authenticated user.");
      setIsSubmittingJob(false);
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      user_id: user.id,
      location_name: locationName,
      cleaner_name: cleanerName,
      status: jobStatus,
      job_date: jobDate,
    });

    if (error) {
      setAddJobError(error.message);
      setIsSubmittingJob(false);
      return;
    }

    setLocationName("");
    setCleanerName("");
    setJobStatus("pending");
    setJobDate(getTodayDateInputValue());
    setIsAddJobOpen(false);
    setIsSubmittingJob(false);
    await fetchJobs();
  };

  const toDbStatus = (status: JobStatus): DbJobStatus =>
    status === "Complete" ? "complete" : status === "In progress" ? "in_progress" : "pending";

  const getStatusSelectStyles = (status: DbJobStatus) =>
    status === "complete"
      ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
      : status === "in_progress"
        ? "border-amber-300/30 bg-amber-400/15 text-amber-100"
        : "border-slate-300/20 bg-slate-300/10 text-slate-100";

  const statusOptions: DbJobStatus[] = ["pending", "in_progress", "complete"];

  const onJobStatusChange = async (jobId: string, nextStatus: DbJobStatus) => {
    if (!supabase) {
      setJobsError("Supabase environment variables are missing.");
      return;
    }

    setUpdatingJobId(jobId);
    setJobsError(null);

    const { error } = await supabase.from("jobs").update({ status: nextStatus }).eq("id", jobId);

    if (error) {
      setJobsError(error.message);
      setUpdatingJobId(null);
      return;
    }

    if (nextStatus === "complete") {
      const job = jobs.find((item) => item.id === jobId);

      if (job) {
        try {
          console.log("Calling /api/notify for completed job", {
            jobId,
            location_name: job.location,
            cleaner_name: job.cleaner,
            client_email: "tyler671@gmail.com",
          });

          const notifyResponse = await fetch("/api/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location_name: job.location,
              cleaner_name: job.cleaner,
              client_email: "tyler671@gmail.com",
            }),
          });

          const notifyResult = (await notifyResponse.json().catch(() => null)) as
            | { error?: string; success?: boolean }
            | null;

          console.log("Response from /api/notify", {
            ok: notifyResponse.ok,
            status: notifyResponse.status,
            body: notifyResult,
          });

          if (!notifyResponse.ok) {
            setJobsError(
              notifyResult?.error ??
                "Status updated, but failed to send completion notification email.",
            );
          }
        } catch {
          console.log("Error calling /api/notify for completed job", { jobId });
          setJobsError("Status updated, but failed to send completion notification email.");
        }
      }
    }

    await fetchJobs();
    setUpdatingJobId(null);
    setOpenStatusMenuJobId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 font-[family-name:var(--font-geist-sans)] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-emerald-950/50 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-300/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-emerald-300"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-emerald-50">ProofClean</p>
              <p className="text-xs font-medium text-emerald-200/80">Dashboard</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            disabled={!supabase || isSigningOut}
            className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-emerald-50 ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-50 sm:text-3xl">
            Tonight’s operations
          </h1>
          <p className="mt-2 text-sm font-medium text-emerald-100/75">
            Real-time proof of clean, status snapshots, and client-ready updates.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-50">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-emerald-50">Jobs</h2>
              <p className="mt-1 text-sm font-medium text-emerald-100/70">
                Jobs for your current account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddJobOpen((prev) => !prev);
                setAddJobError(null);
              }}
              className="rounded-lg bg-emerald-400/10 px-3.5 py-2 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400/20"
            >
              + Add Job
            </button>
          </div>

          {isAddJobOpen ? (
            <form
              onSubmit={onAddJobSubmit}
              className="mt-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="locationName"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-100/80"
                  >
                    Location Name
                  </label>
                  <input
                    id="locationName"
                    name="locationName"
                    type="text"
                    required
                    value={locationName}
                    onChange={(event) => setLocationName(event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/50 focus:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
                    placeholder="Main Office"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cleanerName"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-100/80"
                  >
                    Cleaner Name
                  </label>
                  <input
                    id="cleanerName"
                    name="cleanerName"
                    type="text"
                    required
                    value={cleanerName}
                    onChange={(event) => setCleanerName(event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/50 focus:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
                    placeholder="Alex Johnson"
                  />
                </div>
                <div>
                  <label
                    htmlFor="jobDate"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-100/80"
                  >
                    Job Date
                  </label>
                  <input
                    id="jobDate"
                    name="jobDate"
                    type="date"
                    required
                    value={jobDate}
                    onChange={(event) => setJobDate(event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-50 focus:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="jobStatus"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-emerald-100/80"
                  >
                    Status
                  </label>
                  <select
                    id="jobStatus"
                    name="jobStatus"
                    required
                    value={jobStatus}
                    onChange={(event) => setJobStatus(event.target.value as DbJobStatus)}
                    className="w-full rounded-lg border border-white/15 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-50 focus:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
                  >
                    <option value="pending">pending</option>
                    <option value="in_progress">in_progress</option>
                    <option value="complete">complete</option>
                  </select>
                </div>
              </div>
              {addJobError ? (
                <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 ring-1 ring-red-200/30">
                  Could not add job: {addJobError}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddJobOpen(false);
                    setAddJobError(null);
                    setJobDate(getTodayDateInputValue());
                  }}
                  className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-emerald-50 ring-1 ring-white/15 transition hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJob}
                  className="rounded-lg bg-emerald-300/15 px-3.5 py-2 text-sm font-semibold text-emerald-50 ring-1 ring-emerald-300/25 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingJob ? "Adding..." : "Save Job"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 grid gap-4">
            {isLoadingJobs ? (
              <div className="rounded-2xl bg-white/5 p-5 text-sm font-medium text-emerald-100/80 ring-1 ring-white/10">
                Loading jobs...
              </div>
            ) : jobsError ? (
              <div className="rounded-2xl bg-red-500/10 p-5 text-sm font-medium text-red-100 ring-1 ring-red-200/30">
                Could not load jobs: {jobsError}
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl bg-white/5 p-5 text-sm font-medium text-emerald-100/80 ring-1 ring-white/10">
                No jobs found yet.
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200/15 bg-white/5 p-6 ring-1 ring-white/10 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold tracking-tight text-emerald-50 sm:text-xl">
                      {job.location}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-emerald-100/70">
                      Cleaner: <span className="text-emerald-100">{job.cleaner}</span>
                    </p>
                    <p className="mt-1 text-sm font-medium text-emerald-100/70">
                      Job Date: <span className="text-emerald-100">{job.jobDate ?? "Not set"}</span>
                    </p>
                  </div>

                  <div className="relative flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={openStatusMenuJobId === job.id}
                      disabled={updatingJobId === job.id}
                      onClick={() =>
                        setOpenStatusMenuJobId((prev) => (prev === job.id ? null : job.id))
                      }
                      className={`min-w-[9rem] rounded-full border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusSelectStyles(
                        toDbStatus(job.status),
                      )}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{toDbStatus(job.status)}</span>
                        <span className="text-[10px]">{openStatusMenuJobId === job.id ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {openStatusMenuJobId === job.id ? (
                      <div
                        role="menu"
                        className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-emerald-200/20 bg-emerald-950/95 p-1.5 shadow-lg shadow-black/30 ring-1 ring-white/10 backdrop-blur"
                      >
                        {statusOptions.map((statusOption) => {
                          const isCurrentStatus = statusOption === toDbStatus(job.status);
                          return (
                            <button
                              key={statusOption}
                              type="button"
                              role="menuitem"
                              disabled={isCurrentStatus || updatingJobId === job.id}
                              onClick={() => void onJobStatusChange(job.id, statusOption)}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:bg-emerald-800/70 focus:bg-emerald-800/70 focus:outline-none disabled:cursor-default disabled:bg-emerald-700/50 disabled:text-emerald-200"
                            >
                              {statusOption}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

