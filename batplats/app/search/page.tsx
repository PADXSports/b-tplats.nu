import AuthNavbar from "@/components/auth-navbar";
import Footer from "@/components/footer";
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

  let query = supabase.from("listings").select(
    "id, title, price_per_season, max_boat_length, season_start, season_end, harbours!inner(name, city)",
  );

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
  const hasActiveFilters = Boolean(location || !Number.isNaN(boatLength) || selectedDate);

  const formatDate = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("sv-SE");
  };

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
