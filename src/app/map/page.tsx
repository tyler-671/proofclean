"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import type { MapJob } from "@/components/JobsMap";

const JobsMap = dynamic(() => import("@/components/JobsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
  ),
});

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

type JobLocationJoin = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  clients: { name: string } | { name: string }[] | null;
};

type JobRow = {
  id: string;
  location_name: string | null;
  cleaner_id: string | null;
  cleaner_name: string | null;
  status: string;
  job_date: string | null;
  locations: JobLocationJoin | JobLocationJoin[] | null;
};

export default function MapPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [jobs, setJobs] = useState<MapJob[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
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
      .from("jobs")
      .select(
        "id, location_name, cleaner_id, cleaner_name, status, job_date, locations(name, address, latitude, longitude, clients(name))",
      )
      .eq("user_id", user.id)
      .neq("status", "complete")
      .order("job_date", { ascending: true, nullsFirst: false });

    if (error) {
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    let skipped = 0;
    const mappable: MapJob[] = [];

    for (const row of (data as JobRow[]) ?? []) {
      const location = Array.isArray(row.locations)
        ? (row.locations[0] ?? null)
        : row.locations;

      const latitude = location?.latitude;
      const longitude = location?.longitude;

      if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined
      ) {
        skipped += 1;
        continue;
      }

      const clientName = Array.isArray(location?.clients)
        ? (location?.clients[0]?.name ?? null)
        : (location?.clients?.name ?? null);

      mappable.push({
        id: row.id,
        latitude,
        longitude,
        cleanerId: row.cleaner_id,
        cleanerName: row.cleaner_name ?? "Unassigned",
        clientName,
        locationName: location?.name ?? row.location_name ?? "Unknown location",
        address: location?.address ?? null,
        jobDate: row.job_date,
        status: row.status,
      });
    }

    setJobs(mappable);
    setSkippedCount(skipped);
    setIsLoading(false);
  }, [router, isAuthChecked]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const skippedNote = useMemo(() => {
    if (skippedCount === 0) return null;
    const jobWord = skippedCount === 1 ? "job" : "jobs";
    return `${skippedCount} active ${jobWord} hidden — add an address to the location under Clients to map ${skippedCount === 1 ? "it" : "them"}.`;
  }, [skippedCount]);

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <AppShell>
      <section className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Map</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Active jobs plotted by location, colored by assigned cleaner.
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600">
          Loading map...
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          Could not load map: {loadError}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            No active jobs to map yet — add addresses to your locations under{" "}
            <Link href="/clients" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Clients
            </Link>
            .
          </p>
          {skippedNote ? <p className="mt-2 text-xs text-slate-500">{skippedNote}</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-[70vh] min-h-[420px] w-full">
            <JobsMap jobs={jobs} />
          </div>
          {skippedNote ? <p className="text-xs text-slate-500">{skippedNote}</p> : null}
        </div>
      )}
    </AppShell>
  );
}
