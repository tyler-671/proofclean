export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CleanerRow = {
  id: string;
  active: boolean;
};

type JobRow = {
  id: string;
  cleaner_id: string | null;
  location_name: string | null;
  cleaner_name: string | null;
  location_id: string | null;
  status: string;
  user_id: string | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for crew complete API.",
      );
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const token = params.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: cleaner, error: cleanerError } = await supabase
      .from("cleaners")
      .select("id, active")
      .eq("access_token", token)
      .maybeSingle();

    if (cleanerError) {
      console.error("Crew complete API cleaner lookup error:", cleanerError);
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const jobId =
      typeof body === "object" &&
      body !== null &&
      "jobId" in body &&
      typeof (body as { jobId: unknown }).jobId === "string"
        ? (body as { jobId: string }).jobId.trim()
        : "";

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, cleaner_id, location_name, cleaner_name, location_id, status, user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      console.error("Crew complete API job lookup error:", jobError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobRow = job as JobRow;

    if (jobRow.cleaner_id !== cleanerRow.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (jobRow.status === "complete") {
      return NextResponse.json({ alreadyComplete: true }, { status: 200 });
    }

    const { error: updateError } = await supabase
      .from("jobs")
      .update({ status: "complete" })
      .eq("id", jobId);

    if (updateError) {
      console.error("Crew complete API job update error:", updateError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const origin = req.nextUrl.origin;
    const notifyResponse = await fetch(`${origin}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_name: jobRow.location_name,
        cleaner_name: jobRow.cleaner_name,
        location_id: jobRow.location_id,
      }),
    });

    if (!notifyResponse.ok) {
      let detail = "";
      try {
        detail = await notifyResponse.text();
      } catch {
        /* ignore */
      }
      console.error("Crew complete notify failed:", notifyResponse.status, detail);
      return NextResponse.json({
        success: true,
        emailWarning: "Status updated but email may not have sent.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Crew complete API unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
