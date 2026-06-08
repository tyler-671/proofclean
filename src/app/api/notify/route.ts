export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type NotifyPayload = {
  location_name?: string;
  cleaner_name?: string;
  location_id?: string;
  user_id?: string;
  photoUrls?: string[];
};

type EmailAttachment = {
  filename: string;
  content: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseServiceRoleClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
    },
  });
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
    const { location_name, cleaner_name, location_id, user_id, photoUrls } = body;

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

    const attachments: EmailAttachment[] = [];
    const validPhotoUrls = Array.isArray(photoUrls)
      ? photoUrls.filter((u): u is string => typeof u === "string" && u.length > 0)
      : [];

    if (validPhotoUrls.length > 0) {
      for (let i = 0; i < validPhotoUrls.length; i++) {
        try {
          const imageRes = await fetch(validPhotoUrls[i], { cache: "no-store" });
          if (!imageRes.ok) {
            console.error(`Failed to fetch photo ${i + 1}:`, imageRes.status);
            continue;
          }
          const buffer = Buffer.from(await imageRes.arrayBuffer());
          attachments.push({
            filename: `photo-${i + 1}.jpg`,
            content: buffer.toString("base64"),
          });
        } catch (fetchErr) {
          console.error(`Error fetching photo ${i + 1}:`, fetchErr);
        }
      }
    }

    const photoCount = attachments.length;
    const photoLine =
      photoCount > 0
        ? ` ${photoCount} photo${photoCount === 1 ? "" : "s"} attached.`
        : "";

    let senderName: string | null = null;
    let businessName: string | null = null;
    let logoUrl: string | null = null;

    if (user_id) {
      const { data: settings } = await supabaseService
        .from("user_settings")
        .select("sender_name, business_name, logo_url")
        .eq("user_id", user_id)
        .maybeSingle();

      senderName = settings?.sender_name ?? null;
      businessName = settings?.business_name ?? null;
      logoUrl = settings?.logo_url ?? null;
    }

    const fromAddress = senderName
      ? `${senderName} <notifications@proofclean.ca>`
      : "ProofClean <notifications@proofclean.ca>";

    const subject = businessName
      ? `Photo proof from ${businessName}`
      : "Your office has been cleaned ✓";

    const proofSource = businessName ? businessName : "ProofClean";
    const textBody = businessName
      ? `Good news — ${location_name} has been cleaned tonight by ${cleaner_name}. This is your automated proof of clean from ${businessName}.${photoLine}`
      : `Good news — ${location_name} has been cleaned tonight by ${cleaner_name}. This is your automated proof of clean from ${proofSource}.${photoLine}`;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const trimmedLogoUrl = logoUrl?.trim() ?? "";
    const logoBlock =
      trimmedLogoUrl.length > 0
        ? `<img src="${escapeHtml(trimmedLogoUrl)}" alt="${escapeHtml(businessName ?? "Business logo")}" style="max-width: 200px; max-height: 80px; height: auto; display: block; margin: 0 0 24px 0;" />`
        : "";

    const htmlBody = `${logoBlock}<p style="margin: 0; font-family: sans-serif; font-size: 16px; line-height: 1.5; color: #334155;">${escapeHtml(textBody)}</p>`;

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: client.email,
      subject,
      text: textBody,
      html: htmlBody,
      ...(attachments.length > 0 ? { attachments } : {}),
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
