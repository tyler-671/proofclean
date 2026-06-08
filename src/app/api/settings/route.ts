export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getAccessToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

function createAuthedClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export type UserSettings = {
  user_id: string;
  business_name: string | null;
  sender_name: string | null;
  logo_url: string | null;
  timezone: string;
  email_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

async function getOrCreateSettings(
  supabase: ReturnType<typeof createAuthedClient>,
  userId: string,
): Promise<{ settings: UserSettings | null; error: string | null }> {
  if (!supabase) {
    return { settings: null, error: "Supabase is not configured." };
  }

  const { data: existing, error: selectError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    return { settings: null, error: selectError.message };
  }

  if (existing) {
    return { settings: existing as UserSettings, error: null };
  }

  const { data: created, error: upsertError } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (!upsertError && created) {
    return { settings: created as UserSettings, error: null };
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackError && fallbackError.code !== "PGRST116") {
    return { settings: null, error: fallbackError.message };
  }

  if (fallback) {
    return { settings: fallback as UserSettings, error: null };
  }

  return {
    settings: null,
    error: upsertError?.message ?? "Could not load settings.",
  };
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const supabase = createAuthedClient(accessToken);
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message ?? "Unauthorized." }, { status: 401 });
    }

    const { settings, error } = await getOrCreateSettings(supabase, user.id);
    if (error || !settings) {
      return NextResponse.json({ error: error ?? "Could not load settings." }, { status: 500 });
    }

    return NextResponse.json({ settings, email: user.email });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

const PATCHABLE_FIELDS = [
  "business_name",
  "sender_name",
  "logo_url",
  "timezone",
  "email_notifications_enabled",
] as const;

type PatchableField = (typeof PATCHABLE_FIELDS)[number];

export async function PATCH(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const supabase = createAuthedClient(accessToken);
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message ?? "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const updates: Partial<Record<PatchableField, string | boolean | null>> = {};

    for (const field of PATCHABLE_FIELDS) {
      if (!(field in body)) continue;

      const value = body[field];

      if (field === "email_notifications_enabled") {
        if (typeof value !== "boolean") {
          return NextResponse.json(
            { error: "email_notifications_enabled must be a boolean." },
            { status: 400 },
          );
        }
        updates[field] = value;
        continue;
      }

      if (value === null || value === "") {
        updates[field] = null;
        continue;
      }

      if (typeof value !== "string") {
        return NextResponse.json({ error: `${field} must be a string.` }, { status: 400 });
      }

      updates[field] = value.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    await getOrCreateSettings(supabase, user.id);

    const { data: updated, error: updateError } = await supabase
      .from("user_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ settings: updated as UserSettings });
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
