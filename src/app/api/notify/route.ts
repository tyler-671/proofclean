import { NextResponse } from "next/server";
import { Resend } from "resend";

type NotifyPayload = {
  location_name?: string;
  cleaner_name?: string;
  client_email?: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY");
      return NextResponse.json(
        { success: false, error: "Missing RESEND_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as NotifyPayload;
    const { location_name, cleaner_name, client_email } = body;

    if (!location_name || !cleaner_name || !client_email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: location_name, cleaner_name, client_email",
        },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "ProofClean <onboarding@resend.dev>",
      to: client_email,
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
