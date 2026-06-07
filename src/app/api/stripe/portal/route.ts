export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    const stripeCustomerId = subscription?.stripe_customer_id as string | null | undefined;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account." },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    const stripe = new Stripe(secretKey);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings`,
    });

    if (!portalSession.url) {
      return NextResponse.json({ error: "Could not create billing portal session." }, { status: 500 });
    }

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("POST /api/stripe/portal error:", error);
    return NextResponse.json({ error: "Failed to open billing portal." }, { status: 500 });
  }
}
