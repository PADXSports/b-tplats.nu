import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

type CheckoutPayload = {
  listingId: string;
  startDate: string;
  endDate: string;
  guestEmail?: string;
};

export async function POST(request: NextRequest) {
  try {
    const { listingId, startDate, endDate, guestEmail } = (await request.json()) as CheckoutPayload;

    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required booking data" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title, harbour_id, price_per_season")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    let harbourName = "Hamn";
    if (listing.harbour_id) {
      const { data: harbour } = await supabase
        .from("harbours")
        .select("name")
        .eq("id", listing.harbour_id)
        .maybeSingle();
      if (harbour?.name) harbourName = harbour.name;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "sek",
            product_data: {
              name: listing.title,
              description: `${harbourName} · ${startDate} - ${endDate}`,
            },
            unit_amount: Math.round(Number(listing.price_per_season) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${listingId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}`,
      metadata: {
        listingId,
        startDate,
        endDate,
        guestEmail: guestEmail || "",
      },
      customer_email: guestEmail || undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
