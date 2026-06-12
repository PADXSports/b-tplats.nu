import Link from "next/link";

import AuthNavbar from "@/components/auth-navbar";
import BookingSuccessCheck from "@/components/booking-success-check";
import Footer from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
    listing_id?: string;
  }>;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

function formatSwedishPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "-";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "-";

  const startLabel = startDate.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
  const endLabel = endDate.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

function formatBookingReference(id: string | null | undefined): string {
  if (!id) return "-";
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatPrice(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return `${Number(amount).toLocaleString("sv-SE")} SEK / säsong`;
}

const NEXT_STEPS = [
  "Du får en bokningsbekräftelse via e-post",
  "Hamnen/värden ser din bokning och dina kontaktuppgifter",
  "Förtöj på din plats från och med startdatumet",
] as const;

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId, listing_id: listingIdParam } = await searchParams;
  const supabase = await createClient();

  let booking:
    | {
        id: string;
        listing_id: string | null;
        start_date: string | null;
        end_date: string | null;
        guest_email: string | null;
        listings: {
          title: string;
          price_per_season: number | null;
          harbours: { name: string; city: string } | null;
        } | null;
      }
    | null = null;

  if (sessionId) {
    const bookingQuery = supabase
      .from("bookings")
      .select(
        "id, listing_id, start_date, end_date, guest_email, listings(title, price_per_season, harbours(name, city))",
      )
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    const { data } = await bookingQuery;

    const row = data as Record<string, unknown> | null;
    const listingRelation =
      row && Array.isArray(row.listings)
        ? (row.listings[0] as Record<string, unknown> | undefined)
        : ((row?.listings as Record<string, unknown> | null | undefined) ?? null);
    const harbourRelation =
      listingRelation && Array.isArray(listingRelation.harbours)
        ? (listingRelation.harbours[0] as Record<string, unknown> | undefined)
        : ((listingRelation?.harbours as Record<string, unknown> | null | undefined) ?? null);

    booking = row
      ? {
          id: (row.id as string) ?? "",
          listing_id: (row.listing_id as string | null) ?? null,
          start_date: (row.start_date as string | null) ?? null,
          end_date: (row.end_date as string | null) ?? null,
          guest_email: (row.guest_email as string | null) ?? null,
          listings: listingRelation
            ? {
                title: (listingRelation.title as string) ?? "Båtplats",
                price_per_season: (listingRelation.price_per_season as number | null) ?? null,
                harbours: harbourRelation
                  ? {
                      name: (harbourRelation.name as string) ?? "Okänd hamn",
                      city: (harbourRelation.city as string) ?? "Okänd stad",
                    }
                  : null,
              }
            : null,
        }
      : null;
  }

  const listingHref = `/listings/${booking?.listing_id ?? listingIdParam ?? ""}`;

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0a1628]">
      <AuthNavbar currentPage="profile" />

      <section className="relative overflow-hidden bg-[#0a1628] px-4 py-14 text-white sm:px-6 md:py-16">
        <div
          className="pointer-events-none absolute left-1/2 top-[-30%] h-[420px] w-[600px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(13,148,136,0.14)_0%,transparent_70%)]"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto w-full max-w-[900px] text-center">
          <BookingSuccessCheck />
          <h1 className="mt-6 text-[clamp(1.75rem,4vw,2.25rem)] font-extrabold tracking-[-0.03em]">
            Betalning genomförd!
          </h1>
          <p className="mt-3 text-base text-white/85 sm:text-lg">Din båtplats är bokad och bekräftad</p>
          <p className="mt-2 text-sm text-white/50">En bekräftelse skickas till din e-post</p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto w-full max-w-[900px] rounded-2xl border border-[#dce3ee] bg-white p-4 shadow-[0_4px_16px_rgba(10,22,40,0.06)] sm:p-6 md:p-8">
          <h2 className="text-xl font-extrabold text-[#0a1628]">Bokningsdetaljer</h2>
          {booking ? (
            <>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Båtplats</p>
                  <p className="mt-1 font-semibold text-[#0a1628]">{booking.listings?.title ?? "Båtplats"}</p>
                </div>
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Hamn</p>
                  <p className="mt-1 font-semibold text-[#0a1628]">
                    {booking.listings?.harbours?.name ?? "Okänd hamn"}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Ort</p>
                  <p className="mt-1 font-semibold text-[#0a1628]">
                    {booking.listings?.harbours?.city ?? "Okänd stad"}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Period</p>
                  <p className="mt-1 font-semibold text-[#0a1628]">
                    {formatSwedishPeriod(booking.start_date, booking.end_date)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Pris</p>
                  <p className="mt-1 font-semibold text-[#0a1628]">
                    {formatPrice(booking.listings?.price_per_season)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Bokningsnummer</p>
                  <p className="mt-1 font-semibold tracking-wide text-[#0a1628]">
                    {formatBookingReference(booking.id)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f5f0e8] p-3 sm:col-span-1 sm:p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">E-post</p>
                  <p className="mt-1 font-semibold text-[#0a1628]">{booking.guest_email ?? "Inloggad användare"}</p>
                </div>
              </div>

              <div className="mt-8 border-t border-[#e8edf4] pt-8">
                <h3 className="text-lg font-bold text-[#0a1628]">Vad händer nu?</h3>
                <ol className="mt-5 space-y-4">
                  {NEXT_STEPS.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(13,148,136,0.10)] text-xs font-bold text-[#0d9488]">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-[15px] leading-relaxed text-[#4a5568]">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-[#8a96a8]">
              Vi kunde inte läsa upp bokningsdetaljerna just nu, men betalningen registrerades.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/renter"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0d9488] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f766e] sm:w-auto"
            >
              Se mina bokningar
            </Link>
            {(booking?.listing_id ?? listingIdParam) ? (
              <Link
                href={listingHref}
                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-[#0a1628] bg-transparent px-5 py-3.5 text-sm font-semibold text-[#0a1628] transition hover:bg-[#0a1628] hover:text-white sm:w-auto"
              >
                Visa båtplatsen
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
