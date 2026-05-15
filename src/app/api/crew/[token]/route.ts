export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CleanerRow = {
  id: string;
  name: string;
  active: boolean;
  user_id: string;
};

type JobLocationsJoin = {
  name: string;
  clients: { name: string } | { name: string }[] | null;
};

type JobQueryRow = {
  id: string;
  location_name: string | null;
  status: string;
  job_date: string | null;
  notes: string | null;
  locations: JobLocationsJoin | JobLocationsJoin[] | null;
};

function normalizeLocation(
  location_name: string | null,
  locations: JobQueryRow["locations"],
): { locationName: string; clientName: string | null } {
  const loc = Array.isArray(locations) ? (locations[0] ?? null) : locations;
  const locationName = loc?.name ?? location_name ?? "Unknown location";
  const clients = loc?.clients;
  const clientName = Array.isArray(clients)
    ? (clients[0]?.name ?? null)
    : (clients?.name ?? null);
  return { locationName, clientName };
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for crew API.");
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const token = params.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: cleaner, error: cleanerError } = await supabase
      .from("cleaners")
      .select("id, name, active, user_id")
      .eq("access_token", token)
      .maybeSingle();

    if (cleanerError) {
      console.error("Crew API cleaner lookup error:", cleanerError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if (!cleaner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cleanerRow = cleaner as CleanerRow;

    if (cleanerRow.active === false) {
      return NextResponse.json(
        { error: "This link is no longer active. Contact your manager." },
        { status: 403 },
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select("id, location_name, status, job_date, notes, locations(name, clients(name))")
      .eq("cleaner_id", cleanerRow.id)
      .neq("status", "complete")
      .order("job_date", { ascending: true });

    if (jobsError) {
      console.error("Crew API jobs query error:", jobsError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const jobs = (jobsData ?? []) as JobQueryRow[];

    const mappedJobs = jobs.map((job) => {
      const { locationName, clientName } = normalizeLocation(job.location_name, job.locations);
      return {
        id: job.id,
        locationName,
        clientName,
        status: job.status,
        jobDate: job.job_date,
        notes: job.notes,
      };
    });

    return NextResponse.json(
      {
        cleaner: { id: cleanerRow.id, name: cleanerRow.name },
        jobs: mappedJobs,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("Crew API unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
