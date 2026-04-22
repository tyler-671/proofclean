import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseServerClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey ?? supabaseAnonKey);
};

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const supabase = getSupabaseServerClient();

    if (!secretKey || !supabase) {
      console.error("Missing required server env vars for checkout.");
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
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message ?? "Unauthorized request." }, { status: 401 });
    }

    const stripe = new Stripe(secretKey);
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            recurring: {
              interval: "month",
            },
            product_data: {
              name: "ProofClean Growth Plan",
              description: "ProofClean subscription for commercial cleaning operations",
            },
            unit_amount: 5900,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancel`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout URL was not returned by Stripe" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
