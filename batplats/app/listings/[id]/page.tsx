import Image from "next/image";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import AuthNavbar from "@/components/auth-navbar";
import BookBerthButton from "@/components/book-berth-button";
import Footer from "@/components/footer";
import { createClient as createServerClient } from "@/lib/supabase/server";

type ListingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ListingRecord = {
  id: number | string;
  harbour_id?: number | string | null;
  title: string;
  description: string | null;
  image_url?: string | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  price_per_season: number;
  season_start: string | null;
  season_end: string | null;
  is_available: boolean;
  harbours?: {
    name: string;
    city: string;
    lat: number | null;
    lng: number | null;
  } | null;
};

type BookingRange = {
  start_date: string | null;
  end_date: string | null;
};

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&h=700&fit=crop";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

const formatBookingRangeLine = (start: string | null, end: string | null) => {
  const a = formatDate(start);
  const b = formatDate(end);
  if (a === "-" && b === "-") return null;
  return `${a} — ${b} (Bokad)`;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !listing) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
        <AuthNavbar currentPage="listing" />
        <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 py-20 text-white">
          <div className="mx-auto w-full max-w-[880px] text-center">
            <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
              Oj!
            </p>
            <h1 className="mt-3 text-[2.2rem] font-extrabold leading-tight max-md:text-[1.8rem]">
              Denna båtplats hittades inte
            </h1>
            <p className="mx-auto mt-4 max-w-[620px] text-[1rem] text-white/85">
              Den kanske har tagits bort eller är inte längre tillgänglig.
            </p>
            <Link
              href="/kajplatser"
              className="mt-8 inline-flex rounded-lg bg-[#0d9488] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6]"
            >
              Se alla båtplatser
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  let harbourData: ListingRecord["harbours"] = null;
  if (listing.harbour_id) {
    const { data: harbour, error: harbourError } = await supabase
      .from("harbours")
      .select("*")
      .eq("id", listing.harbour_id)
      .maybeSingle();

    if (!harbourError && harbour) {
      harbourData = {
        name: harbour.name,
        city: harbour.city,
        lat: harbour.lat ?? null,
        lng: harbour.lng ?? null,
      };
    }
  }

  const resolvedListing = {
    ...(listing as ListingRecord),
    harbours: harbourData,
  };

  const supabasePublic = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: bookedRanges, error: bookedRangesError } = await supabasePublic
    .from("bookings")
    .select("start_date, end_date")
    .eq("listing_id", id)
    .eq("status", "confirmed");

  const normalizedBookedRanges = (bookedRanges ?? []) as BookingRange[];
  const serializedBookedRanges = (normalizedBookedRanges ?? []).map((range) => ({
    start_date: range.start_date,
    end_date: range.end_date,
  }));
  if (bookedRangesError) {
    console.error("Failed to fetch bookedRanges:", bookedRangesError);
  }

  const bookedPeriodLines =
    normalizedBookedRanges
      .map((row) => formatBookingRangeLine(row.start_date as string | null, row.end_date as string | null))
      .filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-[#f5f0e8] pb-24 text-[#0f1f3d] md:pb-0">
      <AuthNavbar currentPage="listing" />

      <div className="border-b border-[#dce3ee] bg-white px-6 py-3">
        <div className="mx-auto w-full max-w-[1280px]">
          <Link
            href="/kajplatser"
            className="hidden cursor-pointer items-center gap-1 text-sm font-semibold text-[#0d9488] transition hover:text-[#14b8a6] hover:underline md:inline-flex"
          >
            ← Tillbaka till alla båtplatser
          </Link>
        </div>
      </div>

      <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
            {resolvedListing.harbours?.name ?? "Hamn"}
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">{resolvedListing.title}</h1>
          <p className="mt-2 text-sm text-white/80">{resolvedListing.harbours?.city ?? "Okänd stad"}</p>
          {!resolvedListing.is_available ? (
            <p className="mt-4 inline-flex rounded-lg border border-[#fca5a5] bg-[#7f1d1d]/60 px-4 py-2 text-sm font-semibold text-white">
              Denna båtplats är inte tillgänglig just nu
            </p>
          ) : null}
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="relative mb-6 h-[300px] overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)] md:h-[420px]">
              <Image
                src={resolvedListing.image_url || DEFAULT_HERO_IMAGE}
                alt={resolvedListing.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
              />
              <span className="absolute left-4 top-4 rounded-full bg-[#dff5ea] px-3 py-1 text-[0.74rem] font-semibold text-[#2d9e6b]">
                Tillgänglig
              </span>
            </div>

            <div className="rounded-xl border border-[#dce3ee] bg-white p-6 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <h2 className="mb-4 text-xl font-extrabold text-[#0f1f3d]">Detaljer om båtplatsen</h2>
              <p className="mb-6 text-[0.95rem] leading-relaxed text-[#6b7a8f]">
                {resolvedListing.description?.trim() || "Ingen beskrivning har lagts till ännu."}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Hamn
                  </p>
                  <p className="mt-1 font-semibold">{resolvedListing.harbours?.name ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Stad
                  </p>
                  <p className="mt-1 font-semibold">{resolvedListing.harbours?.city ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Max båtlängd
                  </p>
                  <p className="mt-1 font-semibold">
                    {resolvedListing.max_boat_length != null ? `${resolvedListing.max_boat_length} m` : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Max båtbredd
                  </p>
                  <p className="mt-1 font-semibold">
                    {resolvedListing.max_boat_width != null ? `${resolvedListing.max_boat_width} m` : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Säsong start
                  </p>
                  <p className="mt-1 font-semibold">{formatDate(resolvedListing.season_start)}</p>
                </div>
                <div className="rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Säsong slut
                  </p>
                  <p className="mt-1 font-semibold">{formatDate(resolvedListing.season_end)}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#dce3ee] bg-[#fffbeb] p-5">
                <h3 className="text-lg font-extrabold text-[#0f1f3d]">Bokade perioder</h3>
                {bookedPeriodLines.length === 0 ? (
                  <p className="mt-2 text-sm text-[#8a96a8]">Inga bekräftade bokningar för denna plats ännu.</p>
                ) : (
                  <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-[#92400e]">
                    {bookedPeriodLines.map((line, idx) => (
                      <li key={`${idx}-${line}`}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-[#dce3ee] bg-white p-6 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <p className="text-[0.8rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                Pris
              </p>
              <p className="mt-1 text-[1.75rem] font-extrabold text-[#0f1f3d]">
                {resolvedListing.price_per_season.toLocaleString("sv-SE")} SEK
              </p>
              <p className="text-sm text-[#8a96a8]">per säsong</p>
              {resolvedListing.is_available ? (
                <BookBerthButton
                  listingId={id}
                  listingTitle={resolvedListing.title}
                  harbourName={resolvedListing.harbours?.name ?? "Hamn"}
                  pricePerSeason={resolvedListing.price_per_season}
                  bookedRanges={serializedBookedRanges}
                  isAvailable
                  className="mt-5 w-full rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:cursor-not-allowed disabled:bg-[#8a96a8]"
                />
              ) : (
                <p className="mt-5 rounded-lg border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#d64c3b]">
                  Denna båtplats är inte tillgänglig just nu
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      {resolvedListing.is_available ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dce3ee] bg-white/95 p-4 backdrop-blur md:hidden">
          <BookBerthButton
            listingId={id}
            listingTitle={resolvedListing.title}
            harbourName={resolvedListing.harbours?.name ?? "Hamn"}
            pricePerSeason={resolvedListing.price_per_season}
            bookedRanges={serializedBookedRanges}
            isAvailable
            className="w-full rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:cursor-not-allowed disabled:bg-[#8a96a8]"
          />
        </div>
      ) : null}
      <Footer />
    </main>
  );
}
