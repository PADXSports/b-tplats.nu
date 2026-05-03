import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

type CheckoutPayload = {
  listingId: string;
  startDate: string;
  endDate: string;
  guestEmail?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  boatName?: string;
  boatLength?: string;
};

function dateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function POST(request: NextRequest) {
  try {
    const { listingId, startDate, endDate, guestEmail, firstName, lastName, phone, boatName, boatLength } =
      (await request.json()) as CheckoutPayload;

    if (!listingId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required booking data" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title, harbour_id, price_per_season")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: existingBookings, error: bookingsCheckError } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq("listing_id", listingId)
      .eq("status", "confirmed");

    if (bookingsCheckError) {
      return NextResponse.json({ error: "Could not verify availability" }, { status: 500 });
    }

    const hasConflict = (existingBookings ?? []).some((row) => {
      const s = row.start_date as string | null;
      const e = row.end_date as string | null;
      return Boolean(s && e && dateRangesOverlap(startDate, endDate, s, e));
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "Dessa datum är redan bokade. Välj andra datum." },
        { status: 409 },
      );
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
        renterId: user?.id || "",
        guestEmail: guestEmail || user?.email || "",
        guestFirstName: firstName || "",
        guestLastName: lastName || "",
        guestPhone: phone || "",
        guestBoatName: boatName || "",
        guestBoatLength: boatLength || "",
      },
      customer_email: user?.email || guestEmail,
    });

    if (!session.url) {
      throw new Error("Stripe session URL is missing");
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error details:", error);
    console.error("Stripe checkout error:", error?.message);
    return NextResponse.json({ error: error?.message ?? "Payment failed" }, { status: 500 });
  }
}
