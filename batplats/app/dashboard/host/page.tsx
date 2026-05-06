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
  image_url: string | null;
  price_per_season: number | null;
  is_available: boolean;
};

type Booking = {
  id: number | string;
  listing_id: number | string;
  created_at: string | null;
  renter_id: string | null;
  guest_email: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  listings: {
    id: number | string;
    harbour_id: number | string | null;
    title: string;
    price_per_season: number | null;
  } | null;
  renter: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type Tab = "overview" | "listings" | "bookings";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("sv-SE");
};

const formatPrice = (value: number | null) => `${(value ?? 0).toLocaleString("sv-SE")} SEK / säsong`;

const getStatusMeta = (status: string) => {
  if (status === "pending") {
    return { label: "Väntande", classes: "bg-[#fef9c3] text-[#854d0e]" };
  }
  if (status === "confirmed") {
    return { label: "Bekräftad", classes: "bg-[#dff5ea] text-[#2d9e6b]" };
  }
  if (status === "declined") {
    return { label: "Avböjd", classes: "bg-[#fee2e2] text-[#d64c3b]" };
  }
  return { label: status, classes: "bg-[#dce3ee] text-[#6b7a8f]" };
};

function HostDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedHarbourId, setSelectedHarbourId] = useState<string>("all");
  const [updatingBookingId, setUpdatingBookingId] = useState<string | number | null>(null);
  const [deletingListingId, setDeletingListingId] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "annonser" ? "listings" : tabParam === "bokningar" ? "bookings" : "overview";

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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
          .select("id, title, image_url, price_per_season, is_available, harbour_id")
          .in("harbour_id", harbourIds);
        const nextListings = (listingRows ?? []) as Listing[];
        setListings(nextListings);

        if (nextListings.length > 0) {
          const listingIds = nextListings.map((l) => l.id);
          const { data: bookingRows } = await supabase
            .from("bookings")
            .select(
              "id, listing_id, created_at, status, renter_id, guest_email, start_date, end_date, renter:profiles!bookings_renter_id_fkey(full_name, email)",
            )
            .in("listing_id", listingIds)
            .order("created_at", { ascending: false });

          const listingMap = new Map(nextListings.map((l) => [String(l.id), l]));
          setBookings(
            ((bookingRows ?? []) as Array<Record<string, unknown>>).map((b) => {
              const m = listingMap.get(String(b.listing_id));
              const renterRelation = Array.isArray(b.renter)
                ? (b.renter[0] as Record<string, unknown> | undefined)
                : (b.renter as Record<string, unknown> | null | undefined);
              return {
                id: b.id as string | number,
                listing_id: b.listing_id as string | number,
                created_at: (b.created_at as string | null) ?? null,
                renter_id: (b.renter_id as string | null) ?? null,
                guest_email: (b.guest_email as string | null) ?? null,
                start_date: (b.start_date as string | null) ?? null,
                end_date: (b.end_date as string | null) ?? null,
                status: (b.status as string) ?? "pending",
                listings: m ? { id: m.id, harbour_id: m.harbour_id, title: m.title, price_per_season: m.price_per_season } : null,
                renter: renterRelation
                  ? {
                      full_name: (renterRelation.full_name as string | null) ?? null,
                      email: (renterRelation.email as string | null) ?? null,
                    }
                  : null,
              };
            }),
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

  const refreshBookings = async () => {
    const listingIds = listings.map((l) => l.id);
    if (listingIds.length === 0) {
      setBookings([]);
      return;
    }
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("id, listing_id, created_at, status, renter_id, guest_email, start_date, end_date, renter:profiles!bookings_renter_id_fkey(full_name, email)")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });
    const listingMap = new Map(listings.map((l) => [String(l.id), l]));
    setBookings(
      ((bookingRows ?? []) as Array<Record<string, unknown>>).map((b) => {
        const m = listingMap.get(String(b.listing_id));
        const renterRelation = Array.isArray(b.renter)
          ? (b.renter[0] as Record<string, unknown> | undefined)
          : (b.renter as Record<string, unknown> | null | undefined);
        return {
          id: b.id as string | number,
          listing_id: b.listing_id as string | number,
          created_at: (b.created_at as string | null) ?? null,
          renter_id: (b.renter_id as string | null) ?? null,
          guest_email: (b.guest_email as string | null) ?? null,
          start_date: (b.start_date as string | null) ?? null,
          end_date: (b.end_date as string | null) ?? null,
          status: (b.status as string) ?? "pending",
          listings: m ? { id: m.id, harbour_id: m.harbour_id, title: m.title, price_per_season: m.price_per_season } : null,
          renter: renterRelation
            ? {
                full_name: (renterRelation.full_name as string | null) ?? null,
                email: (renterRelation.email as string | null) ?? null,
              }
            : null,
        };
      }),
    );
  };

  const updateBookingStatus = async (bookingId: string | number, status: "confirmed" | "declined") => {
    setUpdatingBookingId(bookingId);
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) {
      setToast({ type: "error", message: "Kunde inte uppdatera bokningsstatus." });
      setUpdatingBookingId(null);
      return;
    }
    await refreshBookings();
    setToast({ type: "success", message: status === "confirmed" ? "Bokning godkänd." : "Bokning avvisad." });
    setUpdatingBookingId(null);
  };

  const deleteListing = async (listingId: string | number) => {
    if (!window.confirm("Vill du ta bort annonsen?")) return;
    setDeletingListingId(listingId);
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (error) {
      setToast({ type: "error", message: "Kunde inte ta bort annonsen." });
      setDeletingListingId(null);
      return;
    }
    const nextListings = listings.filter((l) => String(l.id) !== String(listingId));
    setListings(nextListings);
    setBookings((prev) => prev.filter((b) => String(b.listing_id) !== String(listingId)));
    setToast({ type: "success", message: "Annonsen togs bort." });
    setDeletingListingId(null);
  };

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

        {toast ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-[#2d9e6b]/40 bg-[#dff5ea] text-[#14532d]"
                : "border-[#d64c3b]/40 bg-[#fee2e2] text-[#7f1d1d]"
            }`}
          >
            {toast.message}
          </div>
        ) : null}

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
            <div className="flex justify-end">
              <button
                onClick={() => router.push("/dashboard/host/hamnar")}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f]"
              >
                Lägg till ny annons
              </button>
            </div>
            {filteredListings.length === 0 ? <p className="text-sm text-white/70">Inga annonser för vald hamn.</p> : filteredListings.map((l) => (
              <article key={l.id} className="rounded-xl bg-[#122a5d] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg bg-[#0b1b3f] text-xs text-white/60">
                      {l.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.image_url} alt={l.title} className="h-full w-full object-cover" />
                      ) : (
                        "Ingen bild"
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{l.title}</p>
                      <p className="text-xs text-white/70">{formatPrice(l.price_per_season)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                          l.is_available ? "bg-[#dff5ea] text-[#2d9e6b]" : "bg-[#dce3ee] text-[#6b7a8f]"
                        }`}
                      >
                        {l.is_available ? "Tillgänglig" : "Inte tillgänglig"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          l.harbour_id ? `/dashboard/host/hamnar/${l.harbour_id}` : "/dashboard/host/hamnar",
                        )
                      }
                      className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold"
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => void deleteListing(l.id)}
                      disabled={deletingListingId === l.id}
                      className="rounded-lg border border-[#d64c3b]/60 px-3 py-2 text-xs font-semibold text-[#fca5a5] disabled:opacity-50"
                    >
                      {deletingListingId === l.id ? "Tar bort..." : "Ta bort"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "bookings" ? (
          <div className="space-y-3">
            {filteredBookings.length === 0 ? <p className="text-sm text-white/70">Inga bokningar för vald hamn.</p> : filteredBookings.map((b) => (
              <article key={b.id} className="rounded-xl bg-[#122a5d] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{b.listings?.title ?? "Okänd annons"}</p>
                    <p className="text-xs text-white/70">
                      Hyresgäst: {b.renter?.full_name || "Okänd"} ({b.renter?.email || b.guest_email || "Ingen e-post"})
                    </p>
                    <p className="text-xs text-white/70">
                      Datum: {formatDate(b.start_date)} - {formatDate(b.end_date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {(() => {
                      const status = getStatusMeta(b.status);
                      return (
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${status.classes}`}>
                          {status.label}
                        </span>
                      );
                    })()}
                    {b.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void updateBookingStatus(b.id, "confirmed")}
                          disabled={updatingBookingId === b.id}
                          className="rounded-lg bg-[#14b8a6] px-3 py-2 text-xs font-semibold text-[#0b1b3f] disabled:opacity-50"
                        >
                          Godkänn
                        </button>
                        <button
                          onClick={() => void updateBookingStatus(b.id, "declined")}
                          disabled={updatingBookingId === b.id}
                          className="rounded-lg border border-[#d64c3b]/60 px-3 py-2 text-xs font-semibold text-[#fca5a5] disabled:opacity-50"
                        >
                          Avvisa
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
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
