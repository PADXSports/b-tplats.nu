import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import AuthNavbar from "@/components/auth-navbar";
import BookBerthButton from "@/components/book-berth-button";
import RentalTypeBadge from "@/components/RentalTypeBadge";
import { BOOKED_BOOKING_STATUSES } from "@/lib/booking-status";
import { isSeasonPeriodBooked, normalizeRentalType } from "@/lib/rental-type";
import Footer from "@/components/footer";
import ListingGallery from "@/components/listing-gallery";
import ListingLocationMap from "@/components/listing-location-map";
import ListingPublishedBanner from "@/components/listing-published-banner";
import ListingReviewsSection from "@/components/listing-reviews-section";
import ListingTravelInfo from "@/components/listing-travel-info";
import { createClient as createServerClient } from "@/lib/supabase/server";

type ListingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ListingRecord = {
  id: number | string;
  owner_id?: string | null;
  listing_type?: string | null;
  harbour_id?: number | string | null;
  harbour_name?: string | null;
  city?: string | null;
  title: string;
  description: string | null;
  image_url?: string | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  price_per_season: number | null;
  season_start: string | null;
  season_end: string | null;
  rental_type?: string | null;
  is_available: boolean;
  lat?: number | null;
  lng?: number | null;
  harbours?: {
    name: string;
    city: string;
    lat: number | null;
    lng: number | null;
    area?: string | null;
    zip_code?: string | null;
    address?: string | null;
  } | null;
};

type BookingRange = {
  start_date: string | null;
  end_date: string | null;
};

type ListingImage = {
  id: string | number;
  image_url: string;
  display_order: number;
};

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
  return `${a} till ${b} (Bokad)`;
};

const getListingPricePeriodText = (listing: { rental_type?: string | null; listing_type?: string | null }) => {
  const rentalType = String(listing.rental_type ?? "").toLowerCase();
  const listingType = String(listing.listing_type ?? "").toLowerCase();

  if (rentalType === "seasonal" || rentalType === "season" || listingType === "säsongsplats") {
    return "per säsong";
  }
  if (rentalType === "short_term" || listingType === "korttid") {
    return "per natt";
  }
  if (rentalType === "flexible") {
    return "per period";
  }
  return "per säsong";
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

    console.log("Harbour data:", harbour);

    if (!harbourError && harbour) {
      harbourData = {
        name: harbour.name,
        city: harbour.city,
        lat: harbour.lat ?? null,
        lng: harbour.lng ?? null,
        area: harbour.area ?? null,
        zip_code: harbour.zip_code ?? null,
        address: harbour.address ?? null,
      };
    }
  }

  const resolvedListing = {
    ...(listing as ListingRecord),
    harbours: harbourData,
  };
  const mapLat = resolvedListing.harbours?.lat ?? resolvedListing.lat ?? null;
  const mapLng = resolvedListing.harbours?.lng ?? resolvedListing.lng ?? null;
  const mapHarbourName =
    resolvedListing.harbours?.name ?? resolvedListing.harbour_name ?? "Hamn";
  const mapCity = resolvedListing.harbours?.city ?? resolvedListing.city ?? "Okänd stad";
  const mapArea = resolvedListing.harbours?.area ?? null;
  const mapAddress = resolvedListing.harbours?.address ?? null;
  const headerCity = (resolvedListing.city ?? resolvedListing.harbours?.city ?? "Okänd stad").toUpperCase();
  const headerSubline = resolvedListing.harbours?.address ?? resolvedListing.city ?? mapCity;

  const supabasePublic = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: bookedRanges, error: bookedRangesError } = await supabasePublic
    .from("bookings")
    .select("start_date, end_date")
    .eq("listing_id", id)
    .in("status", [...BOOKED_BOOKING_STATUSES]);

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

  const { data: listingImagesData } = await supabase
    .from("listing_images")
    .select("id, image_url, display_order")
    .eq("listing_id", id)
    .order("display_order", { ascending: true });

  const galleryImages = ((listingImagesData ?? []) as ListingImage[]).filter((image) => Boolean(image.image_url));
  if (galleryImages.length === 0 && resolvedListing.image_url) {
    galleryImages.push({ id: "legacy-main", image_url: resolvedListing.image_url, display_order: 0 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === resolvedListing.owner_id;
  const ownerDashboardHref =
    resolvedListing.listing_type === "private" ? "/mitt-konto" : "/dashboard/host";
  const rentalType = normalizeRentalType(resolvedListing.rental_type);
  const pricePeriodText = getListingPricePeriodText(resolvedListing);
  const seasonBooked =
    rentalType === "season" &&
    isSeasonPeriodBooked(resolvedListing.season_start, resolvedListing.season_end, normalizedBookedRanges);

  const bookBerthButtonClass =
    "w-full rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:cursor-not-allowed disabled:bg-[#8a96a8]";

  const bookingAction = isOwner ? (
    <div className="mt-5 rounded-xl border-2 border-teal-200 bg-teal-50 p-5 text-center">
      <p className="mb-3 font-semibold text-teal-700">✓ Detta är din annons</p>
      <Link
        href={ownerDashboardHref}
        className="block w-full rounded-xl py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
        style={{ background: "#0d9488" }}
      >
        Hantera annons →
      </Link>
    </div>
  ) : resolvedListing.is_available ? (
    <BookBerthButton
      listingId={id}
      listingTitle={resolvedListing.title}
      harbourName={resolvedListing.harbours?.name ?? "Hamn"}
      pricePerSeason={resolvedListing.price_per_season ?? 0}
      bookedRanges={serializedBookedRanges}
      rentalType={rentalType}
      seasonStart={resolvedListing.season_start}
      seasonEnd={resolvedListing.season_end}
      seasonBooked={seasonBooked}
      isAvailable
      className={`mt-5 ${bookBerthButtonClass}`}
    />
  ) : (
    <p className="mt-5 rounded-lg border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#d64c3b]">
      Denna båtplats är inte tillgänglig just nu
    </p>
  );

  return (
    <main className="min-h-screen bg-[#f5f0e8] pb-24 text-[#0f1f3d] md:pb-0">
      <AuthNavbar currentPage="listing" />

      <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 pb-12 pt-6 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <Link
            href="/kajplatser"
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            Tillbaka till alla båtplatser
          </Link>
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
            PRIVAT PLATS · {headerCity}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[2rem] font-extrabold leading-tight">{resolvedListing.title}</h1>
            <RentalTypeBadge rentalType={rentalType} className="bg-white/10 backdrop-blur" />
          </div>
          <p className="mt-2 text-sm text-white/80">{headerSubline}</p>
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
            <ListingPublishedBanner />
            <ListingGallery title={resolvedListing.title} images={galleryImages} />

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

              {mapLat != null && mapLng != null ? (
                <ListingTravelInfo
                  destinationLat={mapLat}
                  destinationLng={mapLng}
                  destinationLabel={mapHarbourName}
                />
              ) : null}

              {mapLat != null && mapLng != null ? (
                <div className="mt-6 rounded-xl border border-[#dce3ee] bg-[#f5f0e8] p-5">
                  <h3 className="text-lg font-extrabold text-[#0f1f3d]">Plats och omgivning</h3>
                  <p className="mt-2 text-sm text-[#6b7a8f]">
                    {mapHarbourName} • {mapCity}
                    {mapArea ? ` • ${mapArea}` : ""}
                  </p>
                  {mapAddress ? (
                    <p className="mt-1 text-sm text-[#8a96a8]">{mapAddress}</p>
                  ) : null}
                  <div className="mt-4">
                    <ListingLocationMap
                      lat={mapLat}
                      lng={mapLng}
                      harbourName={mapHarbourName}
                      address={mapAddress}
                      height="400px"
                    />
                  </div>
                </div>
              ) : null}

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

              {resolvedListing.harbour_id ? (
                <ListingReviewsSection listingId={id} harbourId={String(resolvedListing.harbour_id)} />
              ) : null}
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-[#dce3ee] bg-white p-6 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <p className="text-[0.8rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                Pris
              </p>
              <p className="mt-1 text-[1.75rem] font-extrabold text-[#0f1f3d]">
                {resolvedListing.price_per_season != null
                  ? `${resolvedListing.price_per_season.toLocaleString("sv-SE")} SEK`
                  : "Pris ej angivet"}
              </p>
              <p className="text-sm text-[#8a96a8]">{pricePeriodText}</p>
              {bookingAction}
            </div>
          </aside>
        </div>
      </section>

      {isOwner || resolvedListing.is_available ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dce3ee] bg-white/95 p-4 backdrop-blur md:hidden">
          {isOwner ? (
            <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-4 text-center">
              <p className="mb-2 font-semibold text-teal-700">✓ Detta är din annons</p>
              <Link
                href={ownerDashboardHref}
                className="block w-full rounded-xl py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: "#0d9488" }}
              >
                Hantera annons →
              </Link>
            </div>
          ) : (
            <BookBerthButton
              listingId={id}
              listingTitle={resolvedListing.title}
              harbourName={resolvedListing.harbours?.name ?? "Hamn"}
              pricePerSeason={resolvedListing.price_per_season ?? 0}
              bookedRanges={serializedBookedRanges}
              rentalType={rentalType}
              seasonStart={resolvedListing.season_start}
              seasonEnd={resolvedListing.season_end}
              seasonBooked={seasonBooked}
              isAvailable
              className={bookBerthButtonClass}
            />
          )}
        </div>
      ) : null}
      <Footer />
    </main>
  );
}
