"use client";

import Image from "next/image";
import Link from "next/link";
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

export default function KajplatserPage() {
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<KajplatsListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "map") {
        setShowMap(true);
      }
    }
  }, []);

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

  const trimmedQuery = locationQuery.trim();
  const normalizedQuery = normalizeValue(locationQuery);
  const filteredListings = useMemo(() => {
    if (trimmedQuery === "") return listings;
    return listings.filter((listing) => {
      const harbourName = listing.harbour_name ?? "";
      const city = listing.city ?? "";
      const area = listing.area ?? "";
      const zipCode = listing.zip_code ?? "";
      return [harbourName, city, area, zipCode].some((field) =>
        normalizeValue(field).includes(normalizedQuery),
      );
    });
  }, [listings, normalizedQuery, trimmedQuery]);

  useEffect(() => {
    console.log("Kajplatser listings:", listings);
    console.log("Fetched listings:", listings);
  }, [listings]);

  useEffect(() => {
    console.log("Location query:", locationQuery);
    console.log("Total listings:", listings.length);
    console.log("Filtered listings:", filteredListings);
  }, [locationQuery, listings.length, filteredListings]);

  const mapListings = useMemo<MapListing[]>(
    () =>
      filteredListings
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
    [filteredListings],
  );

  useEffect(() => {
    console.log("Kajplatser map listings:", mapListings);
  }, [mapListings]);

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
            <label className="block w-full max-w-md">
              <span className="mb-1 block text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0f1f3d]">
                Område
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Sök på hamn, stad, område eller postnummer"
                  className="w-full rounded-lg border border-[#dce3ee] bg-white px-3 py-2 pr-10 text-sm text-[#0f1f3d] outline-none transition placeholder:text-[#8a96a8] focus:border-[#0d9488]"
                />
                {locationQuery ? (
                  <button
                    type="button"
                    onClick={() => setLocationQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8a96a8] transition hover:text-[#0f1f3d]"
                    aria-label="Rensa platsfilter"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </label>
            <button
              type="button"
              onClick={() => setShowMap((current) => !current)}
              className="rounded-lg bg-[#0f1f3d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2252]"
            >
              {showMap ? "Dölj karta" : "Visa karta"}
            </button>
          </div>

          {showMap ? <BerthMap height="360px" listings={mapListings} shouldFitBounds={trimmedQuery !== ""} /> : null}

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
          ) : filteredListings.length === 0 ? (
            <div className="mt-5 rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <h2 className="text-xl font-bold text-[#0f1f3d]">Inga annonser hittades</h2>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm font-semibold text-[#0f1f3d]">
                  {filteredListings.length} {filteredListings.length === 1 ? "plats" : "platser"}
                  {trimmedQuery !== "" ? ` i ${trimmedQuery}` : ""}
                </p>
              </div>
              {filteredListings.map((listing) => (
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
