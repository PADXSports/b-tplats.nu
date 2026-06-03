"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  DASHBOARD_NAVY,
  DASHBOARD_TEAL,
  IconBerth,
  IconChart,
  IconClipboardCheck,
  IconCurrency,
  dashboardCardClass,
  StatIconBox,
} from "@/components/dashboard-icons";
import {
  HOST_LOADING_FALLBACK,
  HostDashboardShell,
  HostToast,
  type HostNavKey,
} from "@/components/host-dashboard-shell";
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

const formatCurrency = (value: number) => `${value.toLocaleString("sv-SE")} kr`;

const getStatusMeta = (status: string) => {
  if (status === "pending") {
    return { label: "Väntande", classes: "bg-yellow-100 text-yellow-700" };
  }
  if (status === "confirmed") {
    return { label: "Bekräftad", classes: "bg-green-100 text-green-700" };
  }
  if (status === "declined") {
    return { label: "Avböjd", classes: "bg-red-100 text-red-700" };
  }
  return { label: status, classes: "bg-gray-100 text-gray-600" };
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
  const activeNav: HostNavKey =
    tab === "listings" ? "listings" : tab === "bookings" ? "bookings" : "overview";
  const pageTitle =
    tab === "listings" ? "Annonser" : tab === "bookings" ? "Bokningar" : "Mina Hamnar";

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
  const harbourById = useMemo(
    () => new Map(harbours.map((harbour) => [String(harbour.id), harbour])),
    [harbours],
  );
  const primaryHarbourId = harbours.length > 0 ? String(harbours[0].id) : null;
  const overviewHarbourId = selectedHarbourId === "all" ? primaryHarbourId : selectedHarbourId;
  const overviewHarbour = overviewHarbourId ? harbourById.get(overviewHarbourId) ?? null : null;
  const overviewListings = overviewHarbourId
    ? listings.filter((listing) => String(listing.harbour_id) === overviewHarbourId)
    : [];
  const overviewConfirmedBookings = overviewHarbourId
    ? bookings.filter(
        (booking) => booking.status === "confirmed" && String(booking.listings?.harbour_id ?? "") === overviewHarbourId,
      )
    : [];
  const overviewBookedCount = overviewConfirmedBookings.length;
  const overviewOccupancy = overviewListings.length ? Math.round((overviewBookedCount / overviewListings.length) * 100) : 0;
  const currentYear = new Date().getFullYear();
  const seasonRevenue = overviewConfirmedBookings.reduce((sum, booking) => {
    const startDate = booking.start_date ? new Date(booking.start_date) : null;
    if (!startDate || Number.isNaN(startDate.getTime()) || startDate.getFullYear() !== currentYear) return sum;
    return sum + (booking.listings?.price_per_season ?? 0);
  }, 0);
  const monthlyBuckets = [
    { key: 4, label: "Maj" },
    { key: 5, label: "Jun" },
    { key: 6, label: "Jul" },
    { key: 7, label: "Aug" },
    { key: 8, label: "Sep" },
    { key: 9, label: "Okt" },
  ];
  const monthlyCounts = monthlyBuckets.map((bucket) => {
    const count = overviewConfirmedBookings.filter((booking) => {
      if (!booking.start_date) return false;
      const date = new Date(booking.start_date);
      return !Number.isNaN(date.getTime()) && date.getMonth() === bucket.key;
    }).length;
    return { ...bucket, count };
  });
  const maxMonthlyCount = Math.max(...monthlyCounts.map((bucket) => bucket.count), 1);
  const filteredSeasonRevenue = filteredBookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, booking) => {
      const startDate = booking.start_date ? new Date(booking.start_date) : null;
      if (!startDate || Number.isNaN(startDate.getTime()) || startDate.getFullYear() !== currentYear) {
        return sum;
      }
      return sum + (booking.listings?.price_per_season ?? 0);
    }, 0);

  if (loading) {
    return HOST_LOADING_FALLBACK;
  }

  return (
    <HostDashboardShell
      activeNav={activeNav}
      pageTitle={pageTitle}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/host/hamnar")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Hantera hamnar
          </button>
          {harbours.length > 1 ? (
            <select
              value={selectedHarbourId}
              onChange={(e) => setSelectedHarbourId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm"
            >
              <option value="all">Alla hamnar</option>
              {harbours.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.name ?? "Namnlös hamn"}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      }
    >

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Totalt platser", value: filteredListings.length, icon: <IconBerth /> },
            { label: "Bokade", value: bookedCount, icon: <IconClipboardCheck /> },
            {
              label: "Intäkter",
              value: `${filteredSeasonRevenue.toLocaleString("sv-SE")} kr`,
              icon: <IconCurrency />,
            },
            { label: "Beläggning", value: `${occupancy}%`, icon: <IconChart /> },
          ].map((stat) => (
            <div key={stat.label} className={`${dashboardCardClass} p-5`}>
              <StatIconBox>{stat.icon}</StatIconBox>
              <p className="mb-1 text-2xl font-bold" style={{ color: DASHBOARD_NAVY }}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

      <HostToast toast={toast} />

        {tab === "overview" ? (
          <div className="space-y-6">
            {harbours.length > 1 ? (
              <div className={`${dashboardCardClass} p-5`}>
                <label htmlFor="overview-harbour" className="mb-2 block text-sm font-medium text-gray-700">
                  Välj hamn
                </label>
                <select
                  id="overview-harbour"
                  value={overviewHarbourId ?? ""}
                  onChange={(event) => setSelectedHarbourId(event.target.value)}
                  className="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-500"
                >
                  {harbours.map((harbour) => (
                    <option key={harbour.id} value={String(harbour.id)}>
                      {(harbour.name ?? "Namnlös hamn") + (harbour.city ? `, ${harbour.city}` : "")}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {overviewHarbour ? (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/host/hamnar/${overviewHarbour.id}`)}
                className={`${dashboardCardClass} w-full p-6 text-left transition hover:border-teal-200 hover:shadow-md`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-2xl font-bold leading-tight" style={{ color: DASHBOARD_NAVY }}>
                    {(overviewHarbour.name ?? "Namnlös hamn") +
                      (overviewHarbour.city ? `, ${overviewHarbour.city}` : "")}
                  </p>
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Aktiv
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Totalt platser</p>
                    <p className="mt-1 text-3xl font-bold" style={{ color: DASHBOARD_NAVY }}>
                      {overviewListings.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bokade</p>
                    <p className="mt-1 text-3xl font-bold" style={{ color: DASHBOARD_NAVY }}>
                      {overviewBookedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Beläggning</p>
                    <p className="mt-1 text-3xl font-bold text-teal-600">{overviewOccupancy}%</p>
                  </div>
                </div>

                <div className="mt-7">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Bokningar per månad
                  </p>
                  <div className="space-y-3">
                    {monthlyCounts.map((bucket) => (
                      <div key={bucket.label} className="grid grid-cols-[38px_1fr_30px] items-center gap-3">
                        <span className="text-xs font-semibold text-gray-600">{bucket.label}</span>
                        <div className="h-3 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-teal-500"
                            style={{ width: `${Math.max((bucket.count / maxMonthlyCount) * 100, 6)}%` }}
                          />
                        </div>
                        <span className="text-right text-xs font-semibold text-gray-600">{bucket.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-7 border-t border-gray-100 pt-5">
                  <p className="text-sm text-gray-500">Intäkt denna säsong</p>
                  <p className="mt-1 text-4xl font-bold text-teal-600">{formatCurrency(seasonRevenue)}</p>
                </div>
              </button>
            ) : (
              <div className={`${dashboardCardClass} border-dashed p-6 text-sm text-gray-500`}>
                Inga hamnar hittades ännu. Skapa din första hamn för att komma igång.
              </div>
            )}

            <div className="flex gap-1 rounded-xl bg-gray-200/60 p-1">
              {[
                { value: "overview" as Tab, label: "Översikt", href: "/dashboard/host" },
                { value: "listings" as Tab, label: "Mina annonser", href: "/dashboard/host/listings" },
                { value: "bookings" as Tab, label: "Bokningar", href: "/dashboard/host/bokningar" },
              ].map((item) => (
                <Link
                  key={item.value}
                  href={item.href}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                    tab === item.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "listings" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/dashboard/host/listings/ny")}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: DASHBOARD_TEAL }}
              >
                Lägg till ny annons
              </button>
            </div>
            {filteredListings.length === 0 ? (
              <p className={`${dashboardCardClass} p-6 text-sm text-gray-500`}>Inga annonser för vald hamn.</p>
            ) : (
              filteredListings.map((l) => (
                <article key={l.id} className={`${dashboardCardClass} p-5`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xs text-gray-500">
                        {l.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.image_url} alt={l.title} className="h-full w-full object-cover" />
                        ) : (
                          "Ingen bild"
                        )}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: DASHBOARD_NAVY }}>
                          {l.title}
                        </p>
                        <p className="text-xs text-gray-500">{formatPrice(l.price_per_season)}</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                            l.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {l.is_available ? "Tillgänglig" : "Inte tillgänglig"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/host/listings/${l.id}/redigera`)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Redigera
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteListing(l.id)}
                        disabled={deletingListingId === l.id}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingListingId === l.id ? "Tar bort..." : "Ta bort"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}

        {tab === "bookings" ? (
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <p className={`${dashboardCardClass} p-6 text-sm text-gray-500`}>Inga bokningar för vald hamn.</p>
            ) : (
              filteredBookings.map((b) => (
                <article key={b.id} className={`${dashboardCardClass} p-5`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: DASHBOARD_NAVY }}>
                        {b.listings?.title ?? "Okänd annons"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Hyresgäst: {b.renter?.full_name || "Okänd"} (
                        {b.renter?.email || b.guest_email || "Ingen e-post"})
                      </p>
                      <p className="text-xs text-gray-500">
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
                            type="button"
                            onClick={() => void updateBookingStatus(b.id, "confirmed")}
                            disabled={updatingBookingId === b.id}
                            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            style={{ background: DASHBOARD_TEAL }}
                          >
                            Godkänn
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateBookingStatus(b.id, "declined")}
                            disabled={updatingBookingId === b.id}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Avvisa
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}
    </HostDashboardShell>
  );
}

export default function HostDashboardPage() {
  return (
    <Suspense fallback={HOST_LOADING_FALLBACK}>
      <HostDashboardContent />
    </Suspense>
  );
}
