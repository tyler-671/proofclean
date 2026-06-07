export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function createServiceRoleClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const accessToken = getAccessToken(request);

    if (!secretKey) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const supabase = createAuthedClient(accessToken);
    const supabaseAdmin = createServiceRoleClient();

    if (!supabase || !supabaseAdmin) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message ?? "Unauthorized." }, { status: 401 });
    }

    const userId = user.id;

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    const stripeCustomerId = subscription?.stripe_customer_id as string | null | undefined;

    if (stripeCustomerId) {
      const stripe = new Stripe(secretKey);
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 100,
      });

      for (const sub of activeSubscriptions.data) {
        if (sub.status === "canceled" || sub.status === "incomplete_expired") continue;
        try {
          await stripe.subscriptions.cancel(sub.id);
        } catch (cancelErr) {
          console.error(`Failed to cancel Stripe subscription ${sub.id}:`, cancelErr);
        }
      }
    }

    const { data: photoRows } = await supabaseAdmin
      .from("job_photos")
      .select("storage_path")
      .eq("user_id", userId);

    if (photoRows?.length) {
      const paths = photoRows
        .map((row) => row.storage_path as string)
        .filter((path) => typeof path === "string" && path.length > 0);

      if (paths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("job-photos")
          .remove(paths);

        if (storageError) {
          console.error("Account delete: job-photos storage cleanup error:", storageError);
        }
      }
    }

    await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/account/delete error:", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
