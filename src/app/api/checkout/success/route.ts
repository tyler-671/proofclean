import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseAnonClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

const getSupabaseServiceRoleClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseAnon = getSupabaseAnonClient();
    const supabaseService = getSupabaseServiceRoleClient();

    if (!secretKey || !supabaseAnon || !supabaseService) {
      return NextResponse.json(
        { error: "Missing Stripe or Supabase environment configuration." },
        { status: 500 },
      );
    }

    const authorizationHeader = request.headers.get("authorization");
    const accessToken = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAnon.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message ?? "Unauthorized request." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    const sessionId = body?.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing Stripe session id." }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (session.mode !== "subscription") {
      return NextResponse.json({ error: "Invalid checkout session mode." }, { status: 400 });
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Checkout session is not complete." }, { status: 400 });
    }

    const sessionUserId = session.client_reference_id;
    if (!sessionUserId || sessionUserId !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user." }, { status: 403 });
    }

    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer && "id" in session.customer
          ? session.customer.id
          : null;

    const { error: upsertError } = await supabaseService.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        status: "active",
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stripe checkout success handling failed:", error);
    return NextResponse.json({ error: "Failed to verify checkout session" }, { status: 500 });
  }
}
