import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { hostNotificationEmail, renterConfirmationEmail } from "@/lib/emails/booking-confirmation";
import { getResend } from "@/lib/resend";
import { stripe } from "@/lib/stripe";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const {
      listingId,
      startDate,
      endDate,
      renterId,
      guestEmail,
      guestFirstName,
      guestLastName,
      guestPhone,
      guestBoatName,
      guestBoatLength,
    } = session.metadata ?? {};

    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing booking metadata" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: bookingData, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        listing_id: listingId,
        status: "confirmed",
        start_date: startDate,
        end_date: endDate,
        renter_id: renterId || null,
        guest_email: guestEmail || null,
        guest_first_name: guestFirstName || null,
        guest_last_name: guestLastName || null,
        guest_phone: guestPhone || null,
        stripe_session_id: session.id,
        stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
        message: guestBoatName ? `Båt: ${guestBoatName}, ${guestBoatLength || ""}m` : null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Webhook booking insert failed:", insertError);
      return NextResponse.json({ error: "Failed to save booking" }, { status: 500 });
    }

    // Do NOT set is_available = false — listing stays bookable for other dates.

    try {
      const { data: listingData, error: listingError } = await supabaseAdmin
        .from("listings")
        .select("title, harbour_name, city, price_per_season, owner_id")
        .eq("id", listingId)
        .single();

      if (listingError || !listingData) {
        console.error("Webhook: could not load listing for confirmation emails:", listingError);
      } else {
        const { data: hostProfile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", listingData.owner_id)
          .maybeSingle();

        const { data: hostAuth, error: hostUserError } = await supabaseAdmin.auth.admin.getUserById(
          listingData.owner_id,
        );
        if (hostUserError) {
          console.error("Webhook: could not load host user for email:", hostUserError);
        }

        const hostUser = hostAuth?.user;
        const renterEmailAddr = guestEmail || "";
        const resendClient = getResend();

        if (!resendClient) {
          console.warn("Webhook: RESEND_API_KEY not set; skipping confirmation emails");
        } else if (renterEmailAddr) {
          try {
            await resendClient.emails.send({
              from: "Båtplats.nu <onboarding@resend.dev>",
              to: renterEmailAddr,
              subject: "Din båtplats är bokad! ⚓",
              html: renterConfirmationEmail({
                renterName: guestFirstName || "",
                listingTitle: listingData.title,
                harbourName: listingData.harbour_name,
                city: listingData.city,
                startDate,
                endDate,
                price: listingData.price_per_season,
                bookingId: bookingData.id,
              }),
            });
          } catch (emailErr) {
            console.error("Webhook: renter confirmation email failed:", emailErr);
          }
        }

        if (resendClient && hostUser?.email) {
          try {
            await resendClient.emails.send({
              from: "Båtplats.nu <onboarding@resend.dev>",
              to: hostUser.email,
              subject: "Ny bokning på din båtplats! 🚤",
              html: hostNotificationEmail({
                hostName: hostProfile?.full_name || "",
                listingTitle: listingData.title,
                renterEmail: renterEmailAddr,
                startDate,
                endDate,
                price: listingData.price_per_season,
              }),
            });
          } catch (emailErr) {
            console.error("Webhook: host notification email failed:", emailErr);
          }
        }
      }
    } catch (emailBlockErr) {
      console.error("Webhook: booking confirmation email block error:", emailBlockErr);
    }
  }

  return NextResponse.json({ received: true });
}
