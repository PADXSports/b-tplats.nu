"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AuthNavbar from "@/components/auth-navbar";
import BerthMap from "@/components/BerthMap";
import Footer from "@/components/footer";
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
  image_url?: string | null;
  is_available: boolean;
  created_at: string | null;
};

export default function KajplatserPage() {
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<KajplatsListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

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
          .select("*")
          .order("created_at", { ascending: false });

        if (listingsError) {
          setError(listingsError.message);
          return;
        }

        setListings((data ?? []) as KajplatsListing[]);
      } catch (loadError) {
        console.error(loadError);
        setError("Kunde inte ladda båtplatser just nu.");
      } finally {
        setLoading(false);
      }
    };

    void loadListings();
  }, [supabase]);

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
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={() => setShowMap((current) => !current)}
              className="rounded-lg bg-[#0f1f3d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2252]"
            >
              {showMap ? "Dölj karta" : "Visa karta"}
            </button>
          </div>

          {showMap ? <BerthMap height="360px" /> : null}

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
          ) : listings.length === 0 ? (
            <div className="mt-5 rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <h2 className="text-xl font-bold text-[#0f1f3d]">Inga annonser hittades</h2>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block cursor-pointer overflow-hidden rounded-xl border border-[#dce3ee] bg-white shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-44 w-full bg-gradient-to-br from-[#c5d0de] to-[#dce3ee]">
                    {listing.image_url ? (
                      <Image
                        src={listing.image_url}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-[#8a96a8]">📷</div>
                    )}
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
