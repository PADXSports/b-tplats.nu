"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import BerthMap from "@/components/BerthMap";

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

type SearchResultsPanelProps = {
  listings: SearchResultListing[];
};

const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&h=300&fit=crop";

export default function SearchResultsPanel({ listings }: SearchResultsPanelProps) {
  const [showMap, setShowMap] = useState(false);
  const [sortValue, setSortValue] = useState("recommended");

  const sortedListings = useMemo(() => {
    const next = [...listings];
    if (sortValue === "price-asc") {
      next.sort((a, b) => a.price_per_season - b.price_per_season);
    } else if (sortValue === "price-desc") {
      next.sort((a, b) => b.price_per_season - a.price_per_season);
    }
    return next;
  }, [listings, sortValue]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <select
          value={sortValue}
          onChange={(event) => setSortValue(event.target.value)}
          className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0a2342] outline-none transition focus:border-[#0d9488]"
        >
          <option value="recommended">Sortera: Rekommenderad</option>
          <option value="price-asc">Pris: Lågt till högt</option>
          <option value="price-desc">Pris: Högt till lågt</option>
        </select>
        <button
          onClick={() => setShowMap((current) => !current)}
          className="rounded-lg bg-[#0a2342] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3060]"
        >
          {showMap ? "Dölj karta" : "Visa karta 🗺"}
        </button>
      </div>

      {showMap && <BerthMap height="360px" />}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedListings.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="block overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_15px_rgba(0,0,0,0.08),0_4px_6px_rgba(0,0,0,0.05)]"
          >
            <div className="relative h-[200px] bg-[#f1f5f9]">
              <Image
                src={DEFAULT_LISTING_IMAGE}
                alt="Marina photo"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="p-4">
              <p className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.5px] text-[#0d9488]">
                {listing.harbours?.name ?? "Okänd hamn"}
              </p>
              <h2 className="mb-1 text-base font-bold">{listing.title}</h2>
              <p className="mb-3 text-[0.83rem] text-[#64748b]">
                {listing.harbours?.city ?? "Okänd stad"}
              </p>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-2.5 py-1 text-[0.76rem] text-[#64748b]">
                  Max {listing.max_boat_length}m
                </span>
                <span className="rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-2.5 py-1 text-[0.76rem] text-[#64748b]">
                  Tillgänglig
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-3">
                <p className="text-[1.1rem] font-extrabold text-[#0a2342]">
                  {listing.price_per_season.toLocaleString("sv-SE")} SEK
                  <span className="ml-0.5 text-xs font-normal text-[#64748b]">/säsong</span>
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
