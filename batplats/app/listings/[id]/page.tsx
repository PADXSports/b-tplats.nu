import Image from "next/image";
import { notFound } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import BookBerthButton from "@/components/book-berth-button";
import { createClient } from "@/supabase/utils/supabase/server";

type ListingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ListingRecord = {
  id: number | string;
  title: string;
  description: string | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  price_per_season: number;
  season_start: string | null;
  season_end: string | null;
  is_available: boolean;
  harbours: {
    name: string;
    city: string;
    lat: number | null;
    lng: number | null;
  } | null;
};

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&h=700&fit=crop";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, description, max_boat_length, max_boat_width, price_per_season, season_start, season_end, is_available, harbours!inner(name, city, lat, lng)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const listing = data as ListingRecord;

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-24 text-[#1e293b] md:pb-0">
      <AuthNavbar currentPage="listing" />

      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            {listing.harbours?.name ?? "Harbour"}
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">{listing.title}</h1>
          <p className="mt-2 text-sm text-white/80">{listing.harbours?.city ?? "Unknown city"}</p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="relative mb-6 h-[300px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] md:h-[420px]">
              <Image
                src={DEFAULT_HERO_IMAGE}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
              />
              <span className="absolute left-4 top-4 rounded-full bg-[#dcfce7] px-3 py-1 text-[0.74rem] font-semibold text-[#15803d]">
                {listing.is_available ? "Available" : "Bokad"}
              </span>
            </div>

            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <h2 className="mb-4 text-xl font-extrabold text-[#0a2342]">Listing details</h2>
              <p className="mb-6 text-[0.95rem] leading-relaxed text-[#475569]">
                {listing.description?.trim() || "No description provided for this berth yet."}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Harbour
                  </p>
                  <p className="mt-1 font-semibold">{listing.harbours?.name ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    City
                  </p>
                  <p className="mt-1 font-semibold">{listing.harbours?.city ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Max boat length
                  </p>
                  <p className="mt-1 font-semibold">
                    {listing.max_boat_length != null ? `${listing.max_boat_length} m` : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Max boat width
                  </p>
                  <p className="mt-1 font-semibold">
                    {listing.max_boat_width != null ? `${listing.max_boat_width} m` : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Season start
                  </p>
                  <p className="mt-1 font-semibold">{formatDate(listing.season_start)}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Season end
                  </p>
                  <p className="mt-1 font-semibold">{formatDate(listing.season_end)}</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <p className="text-[0.8rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                Price
              </p>
              <p className="mt-1 text-[1.75rem] font-extrabold text-[#0a2342]">
                {listing.price_per_season.toLocaleString("sv-SE")} SEK
              </p>
              <p className="text-sm text-[#64748b]">per season</p>
              <BookBerthButton
                listingId={listing.id}
                isAvailable={listing.is_available}
                className="mt-5 w-full rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              />
            </div>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e2e8f0] bg-white/95 p-4 backdrop-blur md:hidden">
        <BookBerthButton
          listingId={listing.id}
          isAvailable={listing.is_available}
          className="w-full rounded-lg bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
        />
      </div>
    </main>
  );
}
