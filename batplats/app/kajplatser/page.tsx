"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import AuthNavbar from "@/components/auth-navbar";
import BerthMap, { type MapListing } from "@/components/BerthMap";
import Footer from "@/components/footer";
import { getListingImageSrc } from "@/lib/listing-image";
import { createClient } from "@/lib/supabase/client";

type KajplatsListing = {
  id: number | string;
  title: string;
  description: string | null;
  price_per_season: number | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  season_start: string | null;
  season_end: string | null;
  city: string | null;
  harbour_name: string | null;
  area: string | null;
  zip_code: string | null;
  image_url?: string | null;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  distance_km?: number | null;
};

type ListingRow = {
  id: number | string;
  title: string;
  description: string | null;
  price_per_season: number | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  season_start: string | null;
  season_end: string | null;
  city: string | null;
  harbour_name: string | null;
  image_url?: string | null;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  harbours:
    | {
        name: string | null;
        city: string | null;
        area: string | null;
        zip_code: string | null;
        lat: number | null;
        lng: number | null;
      }
    | Array<{
        name: string | null;
        city: string | null;
        area: string | null;
        zip_code: string | null;
        lat: number | null;
        lng: number | null;
      }>
    | null;
};

const normalizeValue = (value: string) => value.trim().toLowerCase();
const normalizeZipValue = (value: string) => value.replace(/\D/g, "");
const formatSwedishZip = (value: string) => {
  const digits = normalizeZipValue(value);
  if (digits.length < 4) return value.trim();
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)}`.trim();
};
const toDateOnlyValue = (value: string | null) => (value ? value.slice(0, 10) : null);
const toRadians = (value: number) => (value * Math.PI) / 180;
const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export default function KajplatserPage() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<KajplatsListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [activeLocationQuery, setActiveLocationQuery] = useState("");
  const [isLocationSearchActive, setIsLocationSearchActive] = useState(false);
  const [boatLengthQuery, setBoatLengthQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [zipQuery, setZipQuery] = useState("");
  const [radiusInputKm, setRadiusInputKm] = useState(10);
  const [radiusKm, setRadiusKm] = useState(10);
  const [geocodedCenter, setGeocodedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  useEffect(() => {
    const locationParam = searchParams.get("location") ?? "";
    const boatLengthParam = searchParams.get("boat_length") ?? "";
    const dateParam = searchParams.get("date") ?? "";
    const zipParam = searchParams.get("zip") ?? "";
    const shouldShowMap = searchParams.get("view") === "map";

    setLocationInput(locationParam);
    setActiveLocationQuery(locationParam);
    setIsLocationSearchActive(Boolean(locationParam.trim()));
    setBoatLengthQuery(boatLengthParam);
    setDateQuery(dateParam);
    setZipQuery(zipParam);
    if (shouldShowMap) {
      setShowMap(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setRadiusKm(radiusInputKm), 120);
    return () => clearTimeout(timer);
  }, [radiusInputKm]);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const { data, error: listingsError } = await supabase
          .from("listings")
          .select(
            "id, title, description, price_per_season, max_boat_length, max_boat_width, season_start, season_end, city, harbour_name, image_url, is_available, lat, lng, created_at, harbours(name, city, area, zip_code, lat, lng)",
          )
          .order("created_at", { ascending: false });

        if (listingsError) {
          setError(listingsError.message);
          return;
        }

        const normalized = ((data ?? []) as ListingRow[]).map((row) => {
          const harbour = Array.isArray(row.harbours) ? (row.harbours[0] ?? null) : row.harbours;

          return {
            id: row.id,
            title: row.title,
            description: row.description,
            price_per_season: row.price_per_season,
            max_boat_length: row.max_boat_length,
            max_boat_width: row.max_boat_width,
            season_start: row.season_start,
            season_end: row.season_end,
            city: row.city ?? harbour?.city ?? null,
            harbour_name: row.harbour_name ?? harbour?.name ?? null,
            area: harbour?.area ?? null,
            zip_code: harbour?.zip_code ?? null,
            image_url: row.image_url,
            is_available: row.is_available,
            lat: row.lat ?? harbour?.lat ?? null,
            lng: row.lng ?? harbour?.lng ?? null,
            created_at: row.created_at,
          } satisfies KajplatsListing;
        });

        setListings(normalized);
      } catch (loadError) {
        console.error(loadError);
        setError("Kunde inte ladda båtplatser just nu.");
      } finally {
        setLoading(false);
      }
    };

    void loadListings();
  }, [supabase]);

  const trimmedLocationInput = locationInput.trim();
  const trimmedLocationQuery = activeLocationQuery.trim();
  const normalizedLocationQuery = normalizeValue(activeLocationQuery);
  const normalizedLocationZip = normalizeZipValue(activeLocationQuery);
  const normalizedZipQuery = normalizeZipValue(zipQuery);
  const effectiveZipQuery = normalizedZipQuery || normalizedLocationZip;
  const searchQuery = (trimmedLocationQuery || formatSwedishZip(effectiveZipQuery)).trim();
  const hasLocationOrZipSearch = isLocationSearchActive && searchQuery.length > 0;
  const activeSearchCenter = geocodedCenter;
  const parsedBoatLength = Number(boatLengthQuery);
  const hasBoatLengthFilter = boatLengthQuery.trim() !== "" && Number.isFinite(parsedBoatLength);
  const hasDateFilter = dateQuery.trim() !== "";

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!hasLocationOrZipSearch || !apiKey) {
      setGeocodedCenter(null);
      setGeocodeError(!apiKey && hasLocationOrZipSearch ? "Geocoding API-nyckel saknas." : null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const looksLikeZip = /^\d{5}$/.test(searchQuery.replace(/\s+/g, ""));
      const queryVariants = [
        searchQuery,
        looksLikeZip ? `${searchQuery} Stockholm` : `${searchQuery}, Stockholm`,
        `${searchQuery}, Stockholm, Sweden`,
      ];

      try {
        console.log("Geocoding query:", searchQuery);
        let resolvedLocation: { lat: number; lng: number } | null = null;

        for (const candidate of queryVariants) {
          const url =
            `https://maps.googleapis.com/maps/api/geocode/json?` +
            `address=${encodeURIComponent(candidate)}&` +
            `components=country:SE&` +
            `key=${apiKey}`;

          const response = await fetch(url);
          const payload = (await response.json()) as {
            status?: string;
            results?: Array<{
              formatted_address?: string;
              geometry?: { location?: { lat?: number; lng?: number } };
            }>;
            error_message?: string;
          };

          console.log("Geocoding response:", {
            candidate,
            status: payload.status,
            error_message: payload.error_message,
            results_count: payload.results?.length ?? 0,
            first_result: payload.results?.[0]?.formatted_address ?? null,
          });

          const location = payload.results?.[0]?.geometry?.location;
          if (payload.status === "OK" && location?.lat != null && location?.lng != null) {
            resolvedLocation = { lat: location.lat, lng: location.lng };
            break;
          }
        }

        if (!cancelled && resolvedLocation) {
          console.log("Found coordinates:", resolvedLocation.lat, resolvedLocation.lng);
          setGeocodedCenter(resolvedLocation);
          setGeocodeError(null);
        } else if (!cancelled) {
          setGeocodedCenter(null);
          setGeocodeError("Plats kunde inte hittas.");
        }
      } catch {
        if (!cancelled) {
          setGeocodedCenter(null);
          setGeocodeError("Kunde inte ansluta till geocoding-tjänsten.");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasLocationOrZipSearch, searchQuery]);

  const handleLocationSearch = () => {
    const nextQuery = trimmedLocationInput;
    setActiveLocationQuery(nextQuery);
    setIsLocationSearchActive(Boolean(nextQuery));
  };

  const handleResetSearch = () => {
    setLocationInput("");
    setActiveLocationQuery("");
    setIsLocationSearchActive(false);
    setGeocodedCenter(null);
    setRadiusInputKm(10);
    setRadiusKm(10);
  };

  useEffect(() => {
    if (!activeSearchCenter || listings.length === 0) return;
    console.log("Search center:", activeSearchCenter.lat, activeSearchCenter.lng);
    console.log("Checking listings:");
    listings.forEach((listing) => {
      if (listing.lat == null || listing.lng == null) {
        console.log(`- ${listing.title}: missing coordinates`);
        return;
      }
      const distance = haversineDistanceKm(activeSearchCenter.lat, activeSearchCenter.lng, Number(listing.lat), Number(listing.lng));
      console.log(`- ${listing.title}: ${distance.toFixed(2)} km`);
    });
  }, [activeSearchCenter, listings]);

  const filteredListings = useMemo(() => {
    console.log("Current radius km:", radiusKm);
    const withDistance = listings.map((listing) => {
      const hasCoordinates = listing.lat != null && listing.lng != null;
      const distanceKm =
        hasLocationOrZipSearch && activeSearchCenter && hasCoordinates
          ? haversineDistanceKm(activeSearchCenter.lat, activeSearchCenter.lng, Number(listing.lat), Number(listing.lng))
          : null;
      return {
        ...listing,
        distance_km: distanceKm,
      } satisfies KajplatsListing;
    });

    const results = withDistance.filter((listing) => {
      const harbourName = listing.harbour_name ?? "";
      const city = listing.city ?? "";
      const area = listing.area ?? "";
      const matchesRadius =
        !hasLocationOrZipSearch || !activeSearchCenter || (listing.distance_km != null && listing.distance_km <= radiusKm);
      const matchesLocationText =
        !hasLocationOrZipSearch || [harbourName, city, area].some((field) => normalizeValue(field).includes(normalizedLocationQuery));
      const shouldUseRadiusOnly = hasLocationOrZipSearch && activeSearchCenter != null;
      const matchesSearch = shouldUseRadiusOnly ? matchesRadius : matchesLocationText;

      console.log("Listing coords:", listing.lat, listing.lng);
      if (listing.distance_km != null) {
        console.log(
          `Distance: ${listing.distance_km.toFixed(2)} km, Radius: ${radiusKm} km, Within range: ${listing.distance_km <= radiusKm}`,
        );
      }

      const matchesBoatLength =
        !hasBoatLengthFilter || (listing.max_boat_length != null && listing.max_boat_length >= parsedBoatLength);

      const matchesDate =
        !hasDateFilter ||
        (() => {
          const seasonStart = toDateOnlyValue(listing.season_start);
          const seasonEnd = toDateOnlyValue(listing.season_end);
          if (!seasonStart || !seasonEnd) return false;
          return dateQuery >= seasonStart && dateQuery <= seasonEnd;
        })();

      return matchesSearch && matchesBoatLength && matchesDate;
    });
    if (!hasLocationOrZipSearch) return results;
    return [...results].sort((a, b) => (a.distance_km ?? Number.POSITIVE_INFINITY) - (b.distance_km ?? Number.POSITIVE_INFINITY));
  }, [
    listings,
    trimmedLocationQuery,
    normalizedLocationQuery,
    normalizedLocationZip,
    activeSearchCenter,
    radiusKm,
    hasLocationOrZipSearch,
    hasBoatLengthFilter,
    parsedBoatLength,
    hasDateFilter,
    dateQuery,
  ]);

  const visibleListings = filteredListings;

  const mapListings = useMemo<MapListing[]>(
    () =>
      visibleListings
        .filter((listing) => listing.lat != null && listing.lng != null)
        .map((listing) => ({
          id: listing.id,
          title: listing.title,
          harbour_name: listing.harbour_name,
          city: listing.city,
          price_per_season: listing.price_per_season,
          is_available: listing.is_available,
          lat: Number(listing.lat),
          lng: Number(listing.lng),
        })),
    [visibleListings],
  );

  useEffect(() => {
    console.log("Listings for grid:", visibleListings);
    console.log("Listings for map:", mapListings);
  }, [visibleListings, mapListings]);

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
      <AuthNavbar currentPage="search" />

      <section className="bg-gradient-to-br from-[#0f1f3d] via-[#0d2252] to-[#0d9488] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">Kajplatser</p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">Alla tillgängliga båtplatser</h1>
          <p className="mt-2 text-sm text-white/80">
            {loading ? "Laddar..." : `${listings.length} ${listings.length === 1 ? "annons" : "annonser"}`}
          </p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-md">
              <label className="block">
                <span className="mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0f1f3d]">
                  Område
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleLocationSearch();
                      }
                    }}
                    placeholder="Sök på hamn, stad, område eller postnummer"
                    className="w-full rounded-lg border border-[#dce3ee] bg-white px-3 py-2 pr-10 text-sm text-[#0f1f3d] outline-none transition placeholder:text-[#8a96a8] focus:border-[#0d9488]"
                  />
                  {locationInput ? (
                    <button
                      type="button"
                      onClick={() => setLocationInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8a96a8] transition hover:text-[#0f1f3d]"
                      aria-label="Rensa platsfilter"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </label>
              <div
                className={`mt-3 overflow-hidden rounded-xl border border-[#dce3ee] bg-white px-4 py-3 transition-all duration-300 ${
                  hasLocationOrZipSearch
                    ? "max-h-32 translate-y-0 opacity-100"
                    : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
                }`}
              >
                <p className="mb-2 text-[0.83rem] font-medium leading-none text-[#4a5568]">
                  Sök inom: <span className="font-semibold text-[#0d9488]">{radiusInputKm}</span>{" "}
                  <span className="text-[#0d9488]">km</span> från postnummer
                </p>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={radiusInputKm}
                  onChange={(event) => setRadiusInputKm(Number(event.target.value))}
                  className="brand-radius-slider"
                  style={
                    {
                      "--range-progress": `${((radiusInputKm - 1) / (15 - 1)) * 100}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLocationSearch}
                className="rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#14b8a6]"
              >
                Sök
              </button>
              <button
                type="button"
                onClick={handleResetSearch}
                className="rounded-lg border border-[#dce3ee] bg-white px-4 py-2 text-sm font-semibold text-[#0f1f3d] transition hover:bg-[#f5f0e8]"
              >
                Rensa
              </button>
              <button
                type="button"
                onClick={() => setShowMap((current) => !current)}
                className="rounded-lg bg-[#0f1f3d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2252]"
              >
                {showMap ? "Dölj karta" : "Visa karta"}
              </button>
            </div>
          </div>

          {showMap ? (
            <BerthMap
              height="360px"
              listings={mapListings}
              shouldFitBounds={hasLocationOrZipSearch || hasBoatLengthFilter || hasDateFilter}
              center={activeSearchCenter}
              radiusKm={hasLocationOrZipSearch ? radiusKm : null}
            />
          ) : null}

          {error ? (
            <div className="mt-5 rounded-xl border border-[#fecaca] bg-[#fff1f2] p-6 text-sm text-[#d64c3b]">
              {error}
            </div>
          ) : loading ? (
            <div className="mt-5 space-y-3">
              {[...Array(4)].map((_, idx) => (
                <div key={`kajplats-skeleton-${idx}`} className="h-20 w-full animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          ) : visibleListings.length === 0 ? (
            <div className="mt-5 rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <h2 className="text-xl font-bold text-[#0f1f3d]">Inga annonser hittades</h2>
              {geocodeError ? <p className="mt-2 text-sm text-[#d64c3b]">{geocodeError}</p> : null}
              {hasLocationOrZipSearch ? (
                <p className="mt-2 text-sm text-[#4a5568]">
                  Inga platser hittades inom {radiusKm} km från {searchQuery}.
                  Prova att öka söksträckan eller sök på stadsdel.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm font-semibold text-[#0f1f3d]">
                  {hasLocationOrZipSearch
                    ? `Visar ${visibleListings.length} ${visibleListings.length === 1 ? "plats" : "platser"} inom ${radiusKm} km`
                    : `${visibleListings.length} ${visibleListings.length === 1 ? "plats" : "platser"}`}
                  {hasLocationOrZipSearch ? ` från ${searchQuery}` : ""}
                </p>
              </div>
              {visibleListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block cursor-pointer overflow-hidden rounded-xl border border-[#dce3ee] bg-white shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-44 w-full bg-gradient-to-br from-[#c5d0de] to-[#dce3ee]">
                    <Image
                      src={getListingImageSrc(listing.image_url)}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                      {listing.harbour_name ?? "Hamn"}
                    </p>
                    <h2 className="mt-1 text-base font-bold text-[#0f1f3d]">{listing.title}</h2>
                    <p className="mt-1 text-sm text-[#8a96a8]">{listing.city ?? "Okänd stad"}</p>
                    <p className="mt-2 text-sm font-semibold text-[#0f1f3d]">
                      {(listing.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong
                    </p>
                    <p className="mt-1 text-xs text-[#8a96a8]">
                      Max: {listing.max_boat_length ?? "-"}m längd · {listing.max_boat_width ?? "-"}m bredd
                    </p>
                    {listing.distance_km != null ? (
                      <p className="mt-1 text-xs font-medium text-[#0d9488]">{listing.distance_km.toFixed(1)} km bort</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
      <style jsx>{`
        .brand-radius-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #0d9488 0%,
            #14b8a6 var(--range-progress),
            #dce3ee var(--range-progress),
            #dce3ee 100%
          );
          outline: none;
          transition: filter 0.2s ease;
        }

        .brand-radius-slider:hover {
          filter: brightness(1.03);
        }

        .brand-radius-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #0d9488;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 10px rgba(15, 31, 61, 0.24);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .brand-radius-slider::-webkit-slider-thumb:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 14px rgba(15, 31, 61, 0.3);
        }

        .brand-radius-slider::-moz-range-track {
          height: 12px;
          border-radius: 999px;
          background: #dce3ee;
        }

        .brand-radius-slider::-moz-range-progress {
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, #0d9488 0%, #14b8a6 100%);
        }

        .brand-radius-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #0d9488;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 10px rgba(15, 31, 61, 0.24);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .brand-radius-slider::-moz-range-thumb:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 14px rgba(15, 31, 61, 0.3);
        }
      `}</style>
    </main>
  );
}
