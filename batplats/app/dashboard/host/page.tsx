"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createClient } from "@/lib/supabase/client";

type Harbour = {
  id: number | string;
  name: string | null;
  city: string | null;
  owner_id: string | null;
  is_active?: boolean | null;
};

type Listing = {
  id: number | string;
  harbour_id: number | string | null;
  title: string;
  is_available: boolean;
};

type Booking = {
  id: number | string;
  listing_id: number | string;
  created_at: string | null;
  status: string;
  listings: { id: number | string; harbour_id: number | string | null; title: string; price_per_season: number | null } | null;
};

type Tab = "overview" | "listings" | "bookings";

function HostDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedHarbourId, setSelectedHarbourId] = useState<string>("all");

  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "annonser" ? "listings" : tabParam === "bokningar" ? "bookings" : "overview";

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.replace("/login?redirect=/dashboard/host");
        return;
      }
      const { data: harbourRows } = await supabase
        .from("harbours")
        .select("id, name, city, owner_id, is_active")
        .eq("owner_id", user.id)
        .order("name", { ascending: true });

      const ownerHarbours = (harbourRows ?? []) as Harbour[];
      setHarbours(ownerHarbours);

      if (ownerHarbours.length === 1) {
        router.replace(`/dashboard/host/hamnar/${ownerHarbours[0].id}`);
        return;
      }

      const harbourIds = ownerHarbours.map((h) => h.id);
      if (harbourIds.length > 0) {
        const { data: listingRows } = await supabase
          .from("listings")
          .select("id, title, is_available, harbour_id")
          .in("harbour_id", harbourIds);
        const nextListings = (listingRows ?? []) as Listing[];
        setListings(nextListings);

        if (nextListings.length > 0) {
          const listingIds = nextListings.map((l) => l.id);
          const { data: bookingRows } = await supabase
            .from("bookings")
            .select("id, listing_id, created_at, status")
            .in("listing_id", listingIds)
            .order("created_at", { ascending: false });

          const listingMap = new Map(nextListings.map((l) => [String(l.id), l]));
          setBookings(
            ((bookingRows ?? []) as Omit<Booking, "listings">[]).map((b) => ({
              ...b,
              listings: (() => {
                const m = listingMap.get(String(b.listing_id));
                return m ? { id: m.id, harbour_id: m.harbour_id, title: m.title, price_per_season: null } : null;
              })(),
            })),
          );
        }
      }

      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const filteredListings = selectedHarbourId === "all"
    ? listings
    : listings.filter((l) => String(l.harbour_id) === selectedHarbourId);

  const filteredBookings = selectedHarbourId === "all"
    ? bookings
    : bookings.filter((b) => String(b.listings?.harbour_id ?? "") === selectedHarbourId);

  const bookedCount = filteredBookings.filter((b) => b.status === "confirmed").length;
  const occupancy = filteredListings.length ? Math.round((bookedCount / filteredListings.length) * 100) : 0;

  if (loading) {
    return <main className="min-h-screen bg-[#0f1f3d]" />;
  }

  return (
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#14b8a6]">Host dashboard</p>
            <h1 className="text-2xl font-extrabold">Alla hamnar</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/dashboard/host/hamnar")} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Hantera hamnar</button>
            <select
              value={selectedHarbourId}
              onChange={(e) => setSelectedHarbourId(e.target.value)}
              className="rounded-lg border border-white/20 bg-[#10234f] px-3 py-2 text-sm"
            >
              <option value="all">Alla hamnar</option>
              {harbours.map((h) => (
                <option key={h.id} value={String(h.id)}>{h.name ?? "Namnlös hamn"}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl bg-[#122a5d] p-5"><p className="text-sm text-white/70">Totalt platser</p><p className="text-3xl font-extrabold">{filteredListings.length}</p></article>
          <article className="rounded-xl bg-[#122a5d] p-5"><p className="text-sm text-white/70">Bokade</p><p className="text-3xl font-extrabold">{bookedCount}</p></article>
          <article className="rounded-xl bg-[#122a5d] p-5"><p className="text-sm text-white/70">Beläggning</p><p className="text-3xl font-extrabold text-[#14b8a6]">{occupancy}%</p></article>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl bg-[#122a5d] p-1">
          {[
            ["overview", "Översikt"],
            ["listings", "Mina annonser"],
            ["bookings", "Bokningar"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => router.push(value === "overview" ? "/dashboard/host" : `/dashboard/host?tab=${value === "listings" ? "annonser" : "bokningar"}`)}
              className={`rounded-lg px-4 py-2 text-sm ${tab === value ? "bg-[#14b8a6] text-[#0b1b3f]" : "text-white/80"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="rounded-xl bg-[#122a5d] p-5 text-sm text-white/80">
            Välj en hamn för detaljerad vy eller öppna hamnhantering för att skapa nya hamnar.
            <div className="mt-3 flex flex-wrap gap-2">
              {harbours.map((h) => (
                <button key={h.id} onClick={() => router.push(`/dashboard/host/hamnar/${h.id}`)} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-xs font-semibold text-[#0b1b3f]">
                  Hantera {h.name ?? "hamn"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "listings" ? (
          <div className="space-y-3">
            {filteredListings.length === 0 ? <p className="text-sm text-white/70">Inga annonser för vald hamn.</p> : filteredListings.map((l) => (
              <article key={l.id} className="rounded-xl bg-[#122a5d] p-4">
                <p className="font-semibold">{l.title}</p>
                <p className="text-xs text-white/70">Status: {l.is_available ? "Aktiv" : "Inaktiv"}</p>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "bookings" ? (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? <p className="text-sm text-white/70">Inga bokningar för vald hamn.</p> : filteredBookings.map((b) => (
              <article key={b.id} className="rounded-xl bg-[#122a5d] p-4">
                <p className="font-semibold">{b.listings?.title ?? "Okänd annons"}</p>
                <p className="text-xs text-white/70">Status: {b.status}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function HostDashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b1b3f]" />}>
      <HostDashboardContent />
    </Suspense>
  );
}
