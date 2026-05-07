import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type NotifyPayload = {
  location_name?: string;
  cleaner_name?: string;
  location_id?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseServiceRoleClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const supabaseService = getSupabaseServiceRoleClient();
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY");
      return NextResponse.json(
        { success: false, error: "Missing RESEND_API_KEY" },
        { status: 500 }
      );
    }
    if (!supabaseService) {
      console.error("Missing Supabase service role configuration");
      return NextResponse.json(
        { success: false, error: "Missing Supabase service role configuration" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as NotifyPayload;
    const { location_name, cleaner_name, location_id } = body;

    if (!location_name || !cleaner_name || !location_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: location_name, cleaner_name, location_id",
        },
        { status: 400 }
      );
    }

    const { data: location, error: locationError } = await supabaseService
      .from("locations")
      .select("client_id")
      .eq("id", location_id)
      .maybeSingle();

    if (locationError || !location?.client_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            locationError?.message ??
            "Could not find a client for the selected location.",
        },
        { status: 400 }
      );
    }

    const { data: client, error: clientError } = await supabaseService
      .from("clients")
      .select("email")
      .eq("id", location.client_id)
      .maybeSingle();

    if (clientError || !client?.email) {
      return NextResponse.json(
        {
          success: false,
          error:
            clientError?.message ??
            "Could not find a client email for the selected location.",
        },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "ProofClean <notifications@proofclean.ca>",
      to: client.email,
      subject: "Your office has been cleaned ✓",
      text: `Good news — ${location_name} has been cleaned tonight by ${cleaner_name}. This is your automated proof of clean from ProofClean.`,
    });

    if (error) {
      console.error("Resend send failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Unexpected /api/notify error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error while sending notification email",
      },
      { status: 500 }
    );
  }
}
