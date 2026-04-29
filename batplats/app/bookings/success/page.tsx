import Link from "next/link";

import AuthNavbar from "@/components/auth-navbar";
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

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: sessionId, listing_id: listingId } = await searchParams;
  const supabase = await createClient();

  let booking:
    | {
        start_date: string | null;
        end_date: string | null;
        guest_email: string | null;
        listings: {
          title: string;
          harbours: { name: string; city: string } | null;
        } | null;
      }
    | null = null;

  if (sessionId) {
    const query = supabase
      .from("bookings")
      .select("start_date, end_date, guest_email, listings(title, harbours(name, city))")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    const { data } = listingId ? await query.eq("listing_id", listingId) : await query;

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
          start_date: (row.start_date as string | null) ?? null,
          end_date: (row.end_date as string | null) ?? null,
          guest_email: (row.guest_email as string | null) ?? null,
          listings: listingRelation
            ? {
                title: (listingRelation.title as string) ?? "Båtplats",
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

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="profile" />
      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-14 text-white">
        <div className="mx-auto w-full max-w-[900px] text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#22c55e] text-4xl shadow-lg">
            ✓
          </div>
          <h1 className="mt-6 text-3xl font-extrabold">Betalning genomförd! 🎉</h1>
          <p className="mt-3 text-white/85">Din båtplats är bokad och bekräftad</p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[900px] rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] sm:p-8">
          <h2 className="text-xl font-extrabold text-[#0a2342]">Bokningsdetaljer</h2>
          {booking ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Båtplats</p>
                <p className="mt-1 font-semibold text-[#0a2342]">{booking.listings?.title ?? "Båtplats"}</p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Hamn</p>
                <p className="mt-1 font-semibold text-[#0a2342]">
                  {booking.listings?.harbours?.name ?? "Okänd hamn"}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Ort</p>
                <p className="mt-1 font-semibold text-[#0a2342]">
                  {booking.listings?.harbours?.city ?? "Okänd stad"}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">Period</p>
                <p className="mt-1 font-semibold text-[#0a2342]">
                  {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                </p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.4px] text-[#0d9488]">E-post</p>
                <p className="mt-1 font-semibold text-[#0a2342]">{booking.guest_email ?? "Inloggad användare"}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#64748b]">
              Vi kunde inte läsa upp bokningsdetaljerna just nu, men betalningen registrerades.
            </p>
          )}

          <div className="mt-8">
            <Link
              href="/dashboard/renter"
              className="inline-flex rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
            >
              Se mina bokningar
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
