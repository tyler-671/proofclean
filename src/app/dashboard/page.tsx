"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Trash2, UserCog } from "lucide-react";
import TopNav from "@/components/TopNav";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type JobStatus = "Complete" | "In progress" | "Pending";
type DbJobStatus = "pending" | "in_progress" | "complete";

type JobCleanerJoin = { id: string; name: string; active: boolean };

type JobRow = {
  id: string;
  location_name: string;
  location_id: string | null;
  cleaner_id: string | null;
  cleaner_name: string;
  status: DbJobStatus;
  job_date: string | null;
  locations:
    | { name: string; clients: { name: string } | { name: string }[] | null }
    | { name: string; clients: { name: string } | { name: string }[] | null }[]
    | null;
  cleaners: JobCleanerJoin | JobCleanerJoin[] | null;
};

type DashboardJob = {
  id: string;
  location: string;
  locationId: string | null;
  clientName: string | null;
  cleaner: string;
  cleanerId: string | null;
  assignedCleaner: JobCleanerJoin | null;
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

type CleanerOption = {
  id: string;
  name: string;
};

const getTodayDateInputValue = () => new Date().toISOString().split("T")[0];

function normalizeJobCleanerJoin(
  cleaners: JobRow["cleaners"],
): JobCleanerJoin | null {
  if (!cleaners) return null;
  return Array.isArray(cleaners) ? (cleaners[0] ?? null) : cleaners;
}

function jobShowsInactiveCleanerWarning(job: DashboardJob): boolean {
  if (job.status === "Complete") return false;
  if (job.assignedCleaner?.active === false) return true;
  const legacyOrphan =
    (job.cleanerId === null || job.cleanerId === "") && job.cleaner.trim() !== "";
  return legacyOrphan;
}

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [cleaners, setCleaners] = useState<CleanerOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [jobStatus, setJobStatus] = useState<DbJobStatus>("pending");
  const [jobDate, setJobDate] = useState(getTodayDateInputValue);
  const [addJobError, setAddJobError] = useState<string | null>(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [openStatusMenuJobId, setOpenStatusMenuJobId] = useState<string | null>(null);
  const [reassigningJobId, setReassigningJobId] = useState<string | null>(null);
  const [reassignSelectedCleanerId, setReassignSelectedCleanerId] = useState("");
  const [isSavingReassign, setIsSavingReassign] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

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

    mappedLocations.sort((a, b) => {
      const clientCompare = a.clientName.localeCompare(b.clientName);
      if (clientCompare !== 0) return clientCompare;

      // Word-starting locations come before number-starting ones
      const aStartsWithLetter = /^[a-z]/i.test(a.name);
      const bStartsWithLetter = /^[a-z]/i.test(b.name);
      if (aStartsWithLetter && !bStartsWithLetter) return -1;
      if (!aStartsWithLetter && bStartsWithLetter) return 1;

      // Both same type: natural sort (so "5th" < "17th", and letters sort A-Z)
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });

    setLocations(mappedLocations);

    const { data: cleanersData, error: cleanersError } = await supabase
      .from("cleaners")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name", { ascending: true });

    if (cleanersError) {
      setJobsError(cleanersError.message);
      setIsLoadingJobs(false);
      return;
    }

    setCleaners((cleanersData ?? []) as CleanerOption[]);

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, location_name, location_id, cleaner_id, cleaner_name, status, job_date, locations(name, clients(name)), cleaners(id, name, active)",
      )
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
      const assignedCleaner = normalizeJobCleanerJoin(job.cleaners);

      return {
        id: job.id,
        location: job.location_name || jobLocation?.name || "Unknown location",
        locationId: job.location_id,
        clientName: Array.isArray(jobLocation?.clients)
          ? (jobLocation?.clients[0]?.name ?? null)
          : (jobLocation?.clients?.name ?? null),
        cleaner: job.cleaner_name,
        cleanerId: job.cleaner_id,
        assignedCleaner,
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
    if (!cleanerId) {
      setAddJobError("Please select a cleaner.");
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

    const selectedCleanerName =
      cleaners.find((cleaner) => cleaner.id === cleanerId)?.name ?? "";

    const { error } = await supabase.from("jobs").insert({
      user_id: user.id,
      location_id: locationId,
      location_name: locations.find((location) => location.id === locationId)?.name ?? "",
      cleaner_id: cleanerId,
      cleaner_name: selectedCleanerName,
      status: jobStatus,
      job_date: jobDate,
    });

    if (error) {
      setAddJobError(error.message);
      setIsSubmittingJob(false);
      return;
    }

    setLocationId("");
    setCleanerId("");
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

  const saveReassign = async () => {
    if (!supabase || !reassigningJobId || !reassignSelectedCleanerId) return;

    setIsSavingReassign(true);
    setJobsError(null);

    const selectedName =
      cleaners.find((cleaner) => cleaner.id === reassignSelectedCleanerId)?.name ?? "";

    const { error } = await supabase
      .from("jobs")
      .update({
        cleaner_id: reassignSelectedCleanerId,
        cleaner_name: selectedName,
      })
      .eq("id", reassigningJobId);

    if (error) {
      setJobsError(error.message);
      setIsSavingReassign(false);
      return;
    }

    setReassigningJobId(null);
    setReassignSelectedCleanerId("");
    setIsSavingReassign(false);
    await fetchJobs();
  };

  const onDeleteJob = async (job: DashboardJob) => {
    if (!window.confirm("Delete this job? This cannot be undone.")) return;

    if (!supabase) {
      setJobsError("Supabase environment variables are missing.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setJobsError(userError?.message ?? "Could not verify authenticated user.");
      return;
    }

    setDeletingJobId(job.id);
    setJobsError(null);

    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id)
      .eq("user_id", user.id);

    if (error) {
      setJobsError(error.message);
      setDeletingJobId(null);
      return;
    }

    if (reassigningJobId === job.id) {
      setReassigningJobId(null);
      setReassignSelectedCleanerId("");
    }
    if (openStatusMenuJobId === job.id) {
      setOpenStatusMenuJobId(null);
    }

    setDeletingJobId(null);
    await fetchJobs();
  };

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }
  return (
    <div className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <TopNav />

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
                    htmlFor="cleanerId"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Cleaner
                  </label>
                  {cleaners.length === 0 ? (
                    <p className="mt-1 mb-1.5 text-xs text-slate-500">
                      You need to add a cleaner before creating a job. Go to the{" "}
                      <Link
                        href="/cleaners"
                        className="text-emerald-600 underline hover:text-emerald-700"
                      >
                        Cleaners
                      </Link>{" "}
                      page to add one.
                    </p>
                  ) : null}
                  <select
                    id="cleanerId"
                    name="cleanerId"
                    required
                    disabled={cleaners.length === 0}
                    value={cleanerId}
                    onChange={(event) => setCleanerId(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" disabled>
                      Select a cleaner
                    </option>
                    {cleaners.map((cleaner) => (
                      <option key={cleaner.id} value={cleaner.id}>
                        {cleaner.name}
                      </option>
                    ))}
                  </select>
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
                    setCleanerId("");
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingJob || locations.length === 0 || cleaners.length === 0
                  }
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
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
                      {job.clientName ?? job.location}
                    </p>
                    {job.clientName ? (
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        📍 <span className="text-slate-900">{job.location}</span>
                      </p>
                    ) : null}
                    <div className="mt-1.5 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-600">
                          Cleaner: <span className="text-slate-900">{job.cleaner}</span>
                        </p>
                        {job.status !== "Complete" && jobShowsInactiveCleanerWarning(job) ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                            Inactive
                          </span>
                        ) : null}
                        {job.status !== "Complete" ? (
                          <button
                            type="button"
                            aria-label="Reassign cleaner"
                            onClick={() => {
                              setOpenStatusMenuJobId(null);
                              setReassigningJobId(job.id);
                              setReassignSelectedCleanerId("");
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <UserCog className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Reassign
                          </button>
                        ) : null}
                      </div>
                      {reassigningJobId === job.id ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          {cleaners.length === 0 ? (
                            <>
                              <p className="text-xs text-slate-500">
                                You need to add a cleaner before reassigning. Go to the{" "}
                                <Link
                                  href="/cleaners"
                                  className="text-emerald-600 underline hover:text-emerald-700"
                                >
                                  Cleaners
                                </Link>{" "}
                                page to add one.
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingReassign}
                                  onClick={() => {
                                    setReassigningJobId(null);
                                    setReassignSelectedCleanerId("");
                                  }}
                                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                              <div className="min-w-[12rem] flex-1">
                                <label
                                  htmlFor={`reassign-cleaner-${job.id}`}
                                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                  Reassign to:
                                </label>
                                <select
                                  id={`reassign-cleaner-${job.id}`}
                                  value={reassignSelectedCleanerId}
                                  onChange={(event) =>
                                    setReassignSelectedCleanerId(event.target.value)
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                >
                                  <option value="" disabled>
                                    Select a cleaner
                                  </option>
                                  {cleaners.map((cleaner) => (
                                    <option key={cleaner.id} value={cleaner.id}>
                                      {cleaner.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isSavingReassign || !reassignSelectedCleanerId}
                                  onClick={() => void saveReassign()}
                                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSavingReassign ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingReassign}
                                  onClick={() => {
                                    setReassigningJobId(null);
                                    setReassignSelectedCleanerId("");
                                  }}
                                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Job Date: <span className="text-slate-900">{job.jobDate ?? "Not set"}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <div className="relative">
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
                    <button
                      type="button"
                      aria-label="Delete job"
                      disabled={deletingJobId === job.id}
                      onClick={() => void onDeleteJob(job)}
                      className="inline-flex cursor-pointer items-center justify-center rounded-md bg-transparent p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
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