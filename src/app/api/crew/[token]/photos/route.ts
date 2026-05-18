export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

type CleanerRow = {
  id: string;
  active: boolean;
  user_id: string;
};

type JobRow = {
  id: string;
  cleaner_id: string | null;
};

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
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
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for crew photos API.",
      );
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const token = params.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      },
    });

    const { data: cleaner, error: cleanerError } = await supabase
      .from("cleaners")
      .select("id, active, user_id")
      .eq("access_token", token)
      .maybeSingle();

    if (cleanerError) {
      console.error("Crew photos API cleaner lookup error:", cleanerError);
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

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const jobIdRaw = formData.get("jobId");
    const jobId = typeof jobIdRaw === "string" ? jobIdRaw.trim() : "";
    const photo = formData.get("photo");

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
    }

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "Missing photo." }, { status: 400 });
    }

    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo too large. Max 10MB." }, { status: 400 });
    }

    if (!photo.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Photos only." }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, cleaner_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      console.error("Crew photos API job lookup error:", jobError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobRow = job as JobRow;

    if (jobRow.cleaner_id !== cleanerRow.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { count: photoCount, error: countError } = await supabase
      .from("job_photos")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId);

    if (countError) {
      console.error("Crew photos API job_photos count error:", countError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    if ((photoCount ?? 0) >= 5) {
      return NextResponse.json({ error: "Max 5 photos per job." }, { status: 400 });
    }

    const fileId = randomUUID();
    const storagePath = `${cleanerRow.user_id}/${jobId}/${fileId}.jpg`;

    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(storagePath, buffer, {
        contentType: photo.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Crew photos API storage upload error:", uploadError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("job_photos").insert({
      job_id: jobId,
      user_id: cleanerRow.user_id,
      storage_path: storagePath,
    });

    if (insertError) {
      console.error("Crew photos API job_photos insert error:", insertError);
      await supabase.storage.from("job-photos").remove([storagePath]);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, storage_path: storagePath },
      { headers: noCacheHeaders },
    );
  } catch (err) {
    console.error("Crew photos API unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
