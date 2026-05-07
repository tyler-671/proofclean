"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  location_id: string | null;
  cleaner_name: string;
  status: DbJobStatus;
  job_date: string | null;
  locations:
    | { name: string; clients: { name: string } | { name: string }[] | null }
    | { name: string; clients: { name: string } | { name: string }[] | null }[]
    | null;
};

type DashboardJob = {
  id: string;
  location: string;
  locationId: string | null;
  clientName: string | null;
  cleaner: string;
  status: JobStatus;
  jobDate: string | null;
};

type LocationOption = {
  id: string;
  name: string;
  clientName: string;
};

type LocationRow = {
  id: string;
  name: string;
  clients: { name: string } | { name: string }[] | null;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

export default function DashboardPage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
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
      setJobsError(subscriptionError.message);
      setIsLoadingJobs(false);
      return;
    }

    if (subscription?.status !== "active") {
      router.replace("/pricing");
      setIsLoadingJobs(false);
      return;
    }

    const { data: locationsData, error: locationsError } = await supabase
      .from("locations")
      .select("id, name, clients(name)")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (locationsError) {
      setJobsError(locationsError.message);
      setIsLoadingJobs(false);
      return;
    }

    const mappedLocations: LocationOption[] = (((locationsData ?? []) as LocationRow[]).map(
      (location) => ({
      id: location.id,
      name: location.name,
      clientName: Array.isArray(location.clients)
        ? (location.clients[0]?.name ?? "Unknown client")
        : (location.clients?.name ?? "Unknown client"),
      }),
    ));

    setLocations(mappedLocations);

    const { data, error } = await supabase
      .from("jobs")
      .select("id, location_name, location_id, cleaner_name, status, job_date, locations(name, clients(name))")
      .eq("user_id", user.id)
      .order("job_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setJobsError(error.message);
      setIsLoadingJobs(false);
      return;
    }

    const mappedJobs: DashboardJob[] = (data as JobRow[]).map((job) => {
      const jobLocation = Array.isArray(job.locations) ? (job.locations[0] ?? null) : job.locations;

      return {
        id: job.id,
        location: job.location_name || jobLocation?.name || "Unknown location",
        locationId: job.location_id,
        clientName: Array.isArray(jobLocation?.clients)
          ? (jobLocation?.clients[0]?.name ?? null)
          : (jobLocation?.clients?.name ?? null),
        cleaner: job.cleaner_name,
        jobDate: job.job_date,
        status:
          job.status === "complete"
            ? "Complete"
            : job.status === "in_progress"
              ? "In progress"
              : "Pending",
      };
    });

    const sortedJobs = [...mappedJobs].sort((a, b) => {
      const aIsComplete = a.status === "Complete";
      const bIsComplete = b.status === "Complete";

      if (aIsComplete && !bIsComplete) return 1;
      if (!aIsComplete && bIsComplete) return -1;

      return 0;
    });

    setJobs(sortedJobs);
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
    if (!locationId) {
      setAddJobError("Please select a location.");
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
      location_id: locationId,
      location_name: locations.find((location) => location.id === locationId)?.name ?? "",
      cleaner_name: cleanerName,
      status: jobStatus,
      job_date: jobDate,
    });

    if (error) {
      setAddJobError(error.message);
      setIsSubmittingJob(false);
      return;
    }

    setLocationId("");
    setCleanerName("");
    setJobStatus("pending");
    setJobDate(getTodayDateInputValue());
    setIsAddJobOpen(false);
    setIsSubmittingJob(false);
    await fetchJobs();
  };

  const toDbStatus = (status: JobStatus): DbJobStatus =>
    status === "Complete" ? "complete" : status === "In progress" ? "in_progress" : "pending";

  const getStatusBadgeStyles = (status: DbJobStatus) =>
    status === "complete"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "in_progress"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

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

      if (job?.locationId) {
        try {
          const notifyResponse = await fetch("/api/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location_name: job.location,
              cleaner_name: job.cleaner,
              location_id: job.locationId,
            }),
          });

          const notifyResult = (await notifyResponse.json().catch(() => null)) as
            | { error?: string; success?: boolean }
            | null;

          if (!notifyResponse.ok) {
            setJobsError(
              notifyResult?.error ??
                "Status updated, but failed to send completion notification email.",
            );
          }
        } catch {
          setJobsError("Status updated, but failed to send completion notification email.");
        }
      }
    }

    await fetchJobs();
    setUpdatingJobId(null);
    setOpenStatusMenuJobId(null);
  };
  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }
  return (
    <div className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
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
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-slate-900">ProofClean</p>
              <p className="text-xs font-medium text-slate-500">Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700"
            >
              Dashboard
            </Link>
            <Link
              href="/clients"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Clients
            </Link>
            <Link
              href="/locations"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Locations
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={!supabase || isSigningOut}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tonight&apos;s operations
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Real-time proof of clean, status snapshots, and client-ready updates.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Jobs</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Jobs for your current account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddJobOpen((prev) => !prev);
                setAddJobError(null);
                if (!isAddJobOpen && locations.length > 0) {
                  setLocationId(locations[0].id);
                }
              }}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              + Add Job
            </button>
          </div>

          {isAddJobOpen ? (
            <form
              onSubmit={onAddJobSubmit}
              className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="locationId"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Location
                  </label>
                  <select
                    id="locationId"
                    name="locationId"
                    required
                    value={locationId}
                    onChange={(event) => setLocationId(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.clientName} - {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="cleanerName"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Alex Johnson"
                  />
                </div>
                <div>
                  <label
                    htmlFor="jobDate"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="jobStatus"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Status
                  </label>
                  <select
                    id="jobStatus"
                    name="jobStatus"
                    required
                    value={jobStatus}
                    onChange={(event) => setJobStatus(event.target.value as DbJobStatus)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="pending">pending</option>
                    <option value="in_progress">in_progress</option>
                    <option value="complete">complete</option>
                  </select>
                </div>
              </div>
              {addJobError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  Could not add job: {addJobError}
                </p>
              ) : locations.length === 0 ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  Add a location first.{" "}
                  <Link href="/locations" className="font-semibold text-emerald-700 hover:text-emerald-800">
                    Go to Locations
                  </Link>
                  .
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddJobOpen(false);
                    setAddJobError(null);
                    setJobDate(getTodayDateInputValue());
                    setLocationId("");
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJob || locations.length === 0}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingJob ? "Adding..." : "Save Job"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-4 grid gap-4">
            {isLoadingJobs ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600">
                Loading jobs...
              </div>
            ) : jobsError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
                Could not load jobs: {jobsError}
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600">
                No jobs found yet.
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                      {job.location}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-slate-600">
                      Cleaner: <span className="text-slate-900">{job.cleaner}</span>
                    </p>
                    {job.clientName ? (
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        Client: <span className="text-slate-900">{job.clientName}</span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Job Date: <span className="text-slate-900">{job.jobDate ?? "Not set"}</span>
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
                      className={`min-w-[9rem] rounded-full border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusBadgeStyles(
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
                        className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
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
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 focus:outline-none disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400"
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