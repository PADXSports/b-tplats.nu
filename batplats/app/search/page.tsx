import AuthNavbar from "@/components/auth-navbar";
import SearchResultsPanel from "@/components/search-results-panel";
import { createClient } from "@/supabase/utils/supabase/server";

type SearchPageProps = {
  searchParams?: Promise<{
    location?: string | string[];
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
  const boatLengthParam = getParam(
    resolvedSearchParams.boatLength ?? resolvedSearchParams.boatlength,
  );
  const boatLength = Number.parseFloat(boatLengthParam);
  const selectedDate = getParam(resolvedSearchParams.date);

  let query = supabase
    .from("listings")
    .select(
      "id, title, price_per_season, max_boat_length, season_start, season_end, harbours!inner(name, city)",
    )
    .eq("is_available", true);

  if (location) {
    query = query.ilike("harbours.city", `%${location}%`);
  }

  if (!Number.isNaN(boatLength)) {
    query = query.gte("max_boat_length", boatLength);
  }

  if (selectedDate) {
    query = query.lte("season_start", selectedDate).gte("season_end", selectedDate);
  }

  const { data, error } = await query;
  const listings = (data ?? []) as SearchResultListing[];
  const hasActiveFilters = Boolean(location || !Number.isNaN(boatLength) || selectedDate);

  const formatDate = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("sv-SE");
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="search" />

      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            Search Results
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">Available berths</h1>
          <p className="mt-2 text-sm text-white/80">
            {listings.length} {listings.length === 1 ? "result" : "results"} found
          </p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="mb-8 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="mb-3 text-[0.75rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
              Active filters
            </p>
            {hasActiveFilters ? (
              <div className="flex flex-wrap gap-2 text-[0.85rem]">
                {location ? (
                  <span className="rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-1.5 text-[#334155]">
                    Location: <strong>{location}</strong>
                  </span>
                ) : null}
                {!Number.isNaN(boatLength) ? (
                  <span className="rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-1.5 text-[#334155]">
                    Boat length: <strong>{boatLength}m+</strong>
                  </span>
                ) : null}
                {selectedDate ? (
                  <span className="rounded-full border border-[#e2e8f0] bg-[#f1f5f9] px-3 py-1.5 text-[#334155]">
                    Date: <strong>{formatDate(selectedDate)}</strong>
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">No filters applied.</p>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-[#fee2e2] bg-[#fff1f2] p-6 text-[#9f1239]">
              Could not load listings right now.
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <h2 className="text-xl font-bold text-[#0a2342]">No results found</h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Try adjusting location, boat length, or date and search again.
              </p>
            </div>
          ) : <SearchResultsPanel listings={listings} />}
        </div>
      </section>

      <footer className="bg-[#0a2342] px-6 pb-6 pt-10 text-white/70">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[0.82rem]">
            <span>© 2026 Båtplats.nu · båtplats.nu</span>
            <span>Made with ♥ in STOCKHOLM, Sweden</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
