export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function createServiceRoleClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
}

function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return null;
  return customer.id;
}

async function updateSubscriptionStatus(
  supabase: SupabaseClient,
  stripeCustomerId: string,
  status: string,
): Promise<"updated" | "no_row" | "error"> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("stripe_customer_id", stripeCustomerId)
    .select("id");

  if (error) {
    console.error(
      `Stripe webhook: DB update failed for customer ${stripeCustomerId} → status ${status}:`,
      error,
    );
    return "error";
  }

  if (!data?.length) {
    console.warn(
      `Stripe webhook: No matching subscription row for stripe_customer_id: ${stripeCustomerId} — skipping`,
    );
    return "no_row";
  }

  console.log(
    `Stripe webhook: Updated subscription for customer ${stripeCustomerId} to status ${status}`,
  );
  return "updated";
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!webhookSecret) {
      console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET env var is missing.");
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    if (!secretKey || !supabaseUrl || !serviceRoleKey) {
      console.error(
        "Stripe webhook: missing STRIPE_SECRET_KEY or Supabase service role configuration.",
      );
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Stripe webhook: missing stripe-signature header.");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook: signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Stripe webhook: received event ${event.type} (${event.id})`);

    const supabase = createServiceRoleClient(supabaseUrl, serviceRoleKey);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = getStripeCustomerId(subscription.customer);

        if (!stripeCustomerId) {
          console.warn(
            `Stripe webhook: ${event.type} missing customer id on subscription ${subscription.id}`,
          );
          return NextResponse.json({ received: true });
        }

        const result = await updateSubscriptionStatus(
          supabase,
          stripeCustomerId,
          subscription.status,
        );

        if (result === "error") {
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        return NextResponse.json({ received: true });
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = getStripeCustomerId(subscription.customer);

        if (!stripeCustomerId) {
          console.warn(
            `Stripe webhook: ${event.type} missing customer id on subscription ${subscription.id}`,
          );
          return NextResponse.json({ received: true });
        }

        const result = await updateSubscriptionStatus(
          supabase,
          stripeCustomerId,
          "canceled",
        );

        if (result === "error") {
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        return NextResponse.json({ received: true });
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = getStripeCustomerId(invoice.customer);

        if (!stripeCustomerId) {
          console.warn(
            `Stripe webhook: ${event.type} missing customer id on invoice ${invoice.id}`,
          );
          return NextResponse.json({ received: true });
        }

        const result = await updateSubscriptionStatus(
          supabase,
          stripeCustomerId,
          "past_due",
        );

        if (result === "error") {
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        return NextResponse.json({ received: true });
      }

      default:
        console.log(`Stripe webhook: ignored event type: ${event.type}`);
        return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("Stripe webhook: unexpected error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
