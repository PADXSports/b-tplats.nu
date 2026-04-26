"use client";

import { useEffect, useMemo, useState } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createSupabaseClient } from "@/lib/supabase-client";

type DashboardTab = "listings" | "bookings";

type OwnerListing = {
  id: number | string;
  title: string;
  price_per_season: number | null;
  is_available: boolean;
};

type OwnerBooking = {
  id: number | string;
  listing_id: number | string;
  renter_id: string | null;
  renter_email?: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  listings: {
    id: number | string;
    title: string;
    owner_id: string;
  } | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [tab, setTab] = useState<DashboardTab>("listings");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async (currentOwnerId: string) => {
    setLoadingListings(true);
    setError(null);

    const { data, error: listingsError } = await supabase
      .from("listings")
      .select("id, title, price_per_season, is_available")
      .eq("owner_id", currentOwnerId)
      .order("id", { ascending: false });

    if (listingsError) {
      setError(listingsError.message);
      setLoadingListings(false);
      return;
    }

    setListings((data ?? []) as OwnerListing[]);
    setLoadingListings(false);
  }, [supabase]);

  const fetchBookings = useCallback(async (currentOwnerId: string) => {
    setLoadingBookings(true);
    setError(null);

    const { data, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, listing_id, renter_id, renter_email, start_date, end_date, status, listings!inner(id, title, owner_id)")
      .eq("listings.owner_id", currentOwnerId)
      .order("id", { ascending: false });

    if (bookingsError) {
      setError(bookingsError.message);
      setLoadingBookings(false);
      return;
    }

    setBookings((data ?? []) as OwnerBooking[]);
    setLoadingBookings(false);
  }, [supabase]);

  const updateBookingStatus = async (bookingId: number | string, status: "confirmed" | "declined") => {
    setError(null);
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setBookings((current) =>
      current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
    );
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/dashboard");
        return;
      }

      if (!mounted) return;

      const userId = session.user.id;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileData?.role !== "owner") {
        router.replace("/profile");
        return;
      }

      await Promise.all([fetchListings(userId), fetchBookings(userId)]);
      if (mounted) {
        setLoadingAuth(false);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [fetchBookings, fetchListings, router, supabase]);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="dashboard" />

      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            Harbour owner
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">Dashboard</h1>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="mb-6 inline-flex rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => setTab("listings")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === "listings"
                  ? "bg-[#0d9488] text-white"
                  : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0a2342]"
              }`}
            >
              Mina platser
            </button>
            <button
              onClick={() => setTab("bookings")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === "bookings"
                  ? "bg-[#0d9488] text-white"
                  : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0a2342]"
              }`}
            >
              Bokningar
            </button>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#9f1239]">
              {error}
            </div>
          ) : null}

          {loadingAuth ? (
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              Laddar dashboard...
            </div>
          ) : null}

          {!loadingAuth && tab === "listings" ? (
            loadingListings ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                Hämtar dina listningar...
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                Inga listningar hittades för detta konto.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => (
                  <article
                    key={listing.id}
                    className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                      Listing
                    </p>
                    <h2 className="text-lg font-bold text-[#0a2342]">{listing.title}</h2>
                    <p className="mt-2 text-sm text-[#475569]">
                      Pris:{" "}
                      {listing.price_per_season != null
                        ? `${listing.price_per_season.toLocaleString("sv-SE")} SEK / säsong`
                        : "-"}
                    </p>
                    <p className="mt-1 text-sm">
                      Status:{" "}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          listing.is_available
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : "bg-[#fee2e2] text-[#b91c1c]"
                        }`}
                      >
                        {listing.is_available ? "Available" : "Bokad"}
                      </span>
                    </p>
                    <button className="mt-4 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-semibold text-[#0a2342] transition hover:border-[#0d9488] hover:text-[#0d9488]">
                      Edit
                    </button>
                  </article>
                ))}
              </div>
            )
          ) : null}

          {!loadingAuth && tab === "bookings" ? (
            loadingBookings ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                Hämtar bokningar...
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                Inga bokningar ännu.
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                          {booking.listings?.title ?? "Okänd plats"}
                        </p>
                        <h3 className="mt-1 text-base font-bold text-[#0a2342]">
                          {booking.renter_email || booking.renter_id || "Okänd hyresgäst"}
                        </h3>
                        <p className="mt-1 text-sm text-[#475569]">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : booking.status === "pending"
                              ? "bg-[#fef9c3] text-[#854d0e]"
                              : "bg-[#fee2e2] text-[#b91c1c]"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => void updateBookingStatus(booking.id, "confirmed")}
                        className="rounded-lg bg-[#0d9488] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
                        disabled={booking.status === "confirmed"}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => void updateBookingStatus(booking.id, "declined")}
                        className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6]"
                        disabled={booking.status === "declined"}
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}
        </div>
      </section>
    </main>
  );
}
