export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JobPhotoRow = {
  id: string;
  storage_path: string;
};

const PHOTO_RETENTION_DAYS = 90;

function getCutoffIso(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PHOTO_RETENTION_DAYS);
  return cutoff.toISOString();
}

function createServiceRoleClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("delete-old-photos cron: CRON_SECRET env var is missing.");
      return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("delete-old-photos cron: unauthorized request.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "delete-old-photos cron: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      );
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const supabase = createServiceRoleClient(supabaseUrl, serviceRoleKey);
    const cutoff = getCutoffIso();
    console.log(`delete-old-photos cron: cutoff created_at < ${cutoff}`);

    const { data: photos, error: queryError } = await supabase
      .from("job_photos")
      .select("id, storage_path")
      .lt("created_at", cutoff);

    if (queryError) {
      console.error("delete-old-photos cron: query error:", queryError);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const rows = (photos ?? []) as JobPhotoRow[];
    console.log(`delete-old-photos cron: found ${rows.length} photo(s) older than 90 days`);

    if (rows.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const ids = rows.map((row) => row.id);
    const storagePaths = rows
      .map((row) => row.storage_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);

    let storageErrors: unknown = null;

    if (storagePaths.length > 0) {
      const { data: removed, error: storageError } = await supabase.storage
        .from("job-photos")
        .remove(storagePaths);

      if (storageError) {
        storageErrors = storageError;
        console.error("delete-old-photos cron: storage deletion error:", storageError);
      } else {
        console.log(
          `delete-old-photos cron: removed ${removed?.length ?? storagePaths.length} file(s) from storage`,
        );
      }
    }

    const { error: dbError } = await supabase.from("job_photos").delete().in("id", ids);

    if (dbError) {
      console.error("delete-old-photos cron: row deletion error:", dbError);
      return NextResponse.json(
        {
          success: false,
          deleted: 0,
          storageErrors,
          dbError,
        },
        { status: 500 },
      );
    }

    console.log(`delete-old-photos cron: deleted ${ids.length} row(s) from job_photos`);

    return NextResponse.json({
      success: true,
      deleted: ids.length,
      storageErrors,
      dbError: null,
    });
  } catch (err) {
    console.error("delete-old-photos cron: unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
