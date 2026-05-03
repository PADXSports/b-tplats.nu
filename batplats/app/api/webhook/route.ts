import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

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

    const supabase = await createClient();

    await supabase.from("bookings").insert({
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
    });

    await supabase.from("listings").update({ is_available: false }).eq("id", listingId);
  }

  return NextResponse.json({ received: true });
}
