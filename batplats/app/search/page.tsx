import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";
import SearchResultsPanel from "@/components/search-results-panel";
import { createClient } from "@/supabase/utils/supabase/server";

type SearchPageProps = {
  searchParams?: Promise<{
    location?: string | string[];
    locationType?: string | string[];
    lat?: string | string[];
    lng?: string | string[];
    boatLength?: string | string[];
    boatlength?: string | string[];
    date?: string | string[];
  }>;
};

type SearchResultListing = {
  id: number | string;
  title: string;
  price_per_season: number;
  max_boat_length: number;
  harbours: {
    name: string;
    city: string;
  } | null;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = (await searchParams) ?? {};
  const getParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

  const location = getParam(resolvedSearchParams.location).trim();
  const locationType = getParam(resolvedSearchParams.locationType).trim().toLowerCase();
  const locationLat = Number.parseFloat(getParam(resolvedSearchParams.lat));
  const locationLng = Number.parseFloat(getParam(resolvedSearchParams.lng));
  const boatLengthParam = getParam(
    resolvedSearchParams.boatLength ?? resolvedSearchParams.boatlength,
  );
  const boatLength = Number.parseFloat(boatLengthParam);
  const selectedDate = getParam(resolvedSearchParams.date);
  const formatDate = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("sv-SE");
  };

  const isValidCoordinate = !Number.isNaN(locationLat) && !Number.isNaN(locationLng);
  const degToRad = (value: number) => (value * Math.PI) / 180;
  const distanceInKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const earthRadiusKm = 6371;
    const dLat = degToRad(bLat - aLat);
    const dLng = degToRad(bLng - aLng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const aa =
      sinLat * sinLat +
      Math.cos(degToRad(aLat)) * Math.cos(degToRad(bLat)) * sinLng * sinLng;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return earthRadiusKm * c;
  };

  const matchingHarbourIds = new Set<number | string>();

  if (location) {
    const escapedLocation = location.replace(/[%_]/g, "\\$&");
    let harbourSearch = supabase
      .from("harbours")
      .select("id, name, city, zip_code, area, lat, lng")
      .or(
        `name.ilike.%${escapedLocation}%,city.ilike.%${escapedLocation}%,zip_code.ilike.%${escapedLocation}%,area.ilike.%${escapedLocation}%`,
      )
      .limit(200);

    if (locationType === "harbour") {
      harbourSearch = harbourSearch.ilike("name", `%${escapedLocation}%`);
    } else if (locationType === "city") {
      harbourSearch = harbourSearch.ilike("city", `%${escapedLocation}%`);
    } else if (locationType === "area") {
      harbourSearch = harbourSearch.ilike("area", `%${escapedLocation}%`);
    } else if (locationType === "zip") {
      harbourSearch = harbourSearch.ilike("zip_code", `%${escapedLocation}%`);
    }

    const { data: matchedHarbours, error: matchedHarboursError } = await harbourSearch;
    if (matchedHarboursError) {
      console.error("Failed to fetch matching harbours:", matchedHarboursError);
    } else {
      for (const harbour of matchedHarbours ?? []) {
        matchingHarbourIds.add(harbour.id as number | string);
      }
    }
  }

  if (isValidCoordinate) {
    const { data: nearbyCandidates, error: nearbyError } = await supabase
      .from("harbours")
      .select("id, lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(2000);

    if (nearbyError) {
      console.error("Failed to fetch nearby harbour candidates:", nearbyError);
    } else {
      for (const harbour of nearbyCandidates ?? []) {
        const lat = Number(harbour.lat);
        const lng = Number(harbour.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
        if (distanceInKm(locationLat, locationLng, lat, lng) <= 5) {
          matchingHarbourIds.add(harbour.id as number | string);
        }
      }
    }
  }

  let query = supabase
    .from("listings")
    .select("id, title, price_per_season, max_boat_length, season_start, season_end, harbour_id, harbours(name, city)");

  if (location || isValidCoordinate) {
    const harbourIds = Array.from(matchingHarbourIds);
    if (harbourIds.length === 0) {
      const hasActiveFilters = Boolean(location || !Number.isNaN(boatLength) || selectedDate || isValidCoordinate);
      return (
        <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
          <AuthNavbar currentPage="search" />
          <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 py-12 text-white">
            <div className="mx-auto w-full max-w-[1280px]">
              <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
                Sökresultat
              </p>
              <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">Tillgängliga båtplatser</h1>
              <p className="mt-2 text-sm text-white/80">0 träffar</p>
            </div>
          </section>

          <section className="px-6 py-10">
            <div className="mx-auto w-full max-w-[1280px]">
              <div className="mb-8 rounded-xl border border-[#dce3ee] bg-white p-4 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
                <p className="mb-3 text-[0.75rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                  Aktiva filter
                </p>
                {hasActiveFilters ? (
                  <div className="flex flex-wrap gap-2 text-[0.85rem]">
                    {location ? (
                      <span className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-3 py-1.5 text-[#4a5568]">
                        Plats: <strong>{location}</strong>
                      </span>
                    ) : null}
                    {!Number.isNaN(boatLength) ? (
                      <span className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-3 py-1.5 text-[#4a5568]">
                        Båtlängd: <strong>{boatLength}m+</strong>
                      </span>
                    ) : null}
                    {selectedDate ? (
                      <span className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-3 py-1.5 text-[#4a5568]">
                        Datum: <strong>{formatDate(selectedDate)}</strong>
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-[#8a96a8]">Inga filter valda.</p>
                )}
              </div>
              <div className="rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
                <h2 className="text-xl font-bold text-[#0f1f3d]">Inga resultat hittades</h2>
                <p className="mt-2 text-sm text-[#8a96a8]">
                  Justera plats, båtlängd eller datum och försök igen.
                </p>
              </div>
            </div>
          </section>
          <Footer />
        </main>
      );
    }

    query = query.in("harbour_id", harbourIds);
  }

  if (!Number.isNaN(boatLength)) {
    query = query.gte("max_boat_length", boatLength);
  }

  if (selectedDate) {
    query = query.lte("season_start", selectedDate).gte("season_end", selectedDate);
  }

  const { data, error } = await query;
  const listings: SearchResultListing[] = ((data ?? []) as Array<Record<string, unknown>>).map(
    (listing) => {
      const harbour = Array.isArray(listing.harbours)
        ? (listing.harbours[0] as Record<string, unknown> | undefined)
        : (listing.harbours as Record<string, unknown> | null | undefined);

      return {
        id: listing.id as string | number,
        title: (listing.title as string) ?? "Okänd båtplats",
        price_per_season: Number(listing.price_per_season ?? 0),
        max_boat_length: Number(listing.max_boat_length ?? 0),
        harbours: harbour
          ? {
              name: (harbour.name as string) ?? "Okänd hamn",
              city: (harbour.city as string) ?? "Okänd stad",
            }
          : null,
      };
    },
  );
  const hasActiveFilters = Boolean(location || !Number.isNaN(boatLength) || selectedDate || isValidCoordinate);

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
      <AuthNavbar currentPage="search" />

      <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
            Sökresultat
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">Tillgängliga båtplatser</h1>
          <p className="mt-2 text-sm text-white/80">
            {listings.length} {listings.length === 1 ? "träff" : "träffar"}
          </p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="mb-8 rounded-xl border border-[#dce3ee] bg-white p-4 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
            <p className="mb-3 text-[0.75rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
              Aktiva filter
            </p>
            {hasActiveFilters ? (
              <div className="flex flex-wrap gap-2 text-[0.85rem]">
                {location ? (
                  <span className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-3 py-1.5 text-[#4a5568]">
                    Plats: <strong>{location}</strong>
                  </span>
                ) : null}
                {!Number.isNaN(boatLength) ? (
                  <span className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-3 py-1.5 text-[#4a5568]">
                    Båtlängd: <strong>{boatLength}m+</strong>
                  </span>
                ) : null}
                {selectedDate ? (
                  <span className="rounded-full border border-[#dce3ee] bg-[#ebe6dc] px-3 py-1.5 text-[#4a5568]">
                    Datum: <strong>{formatDate(selectedDate)}</strong>
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[#8a96a8]">Inga filter valda.</p>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-[#fee2e2] bg-[#fff1f2] p-6 text-[#d64c3b]">
              Kunde inte ladda båtplatser just nu.
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <h2 className="text-xl font-bold text-[#0f1f3d]">Inga resultat hittades</h2>
              <p className="mt-2 text-sm text-[#8a96a8]">
                Justera plats, båtlängd eller datum och försök igen.
              </p>
            </div>
          ) : <SearchResultsPanel listings={listings} />}
        </div>
      </section>

      <Footer />
    </main>
  );
}
