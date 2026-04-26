"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createSupabaseClient } from "@/lib/supabase-client";

type RenterBooking = {
  id: number | string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  listings: {
    id: number | string;
    title: string;
    price_per_season: number | null;
    harbours: {
      name: string;
      city: string;
    } | null;
  } | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userCreatedAt, setUserCreatedAt] = useState<string>("");
  const [bookings, setBookings] = useState<RenterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | number | null>(null);

  const fetchBookings = useCallback(
    async (renterId: string) => {
      const { data, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, status, start_date, end_date, listings(id, title, price_per_season, harbours(name, city))")
        .eq("renter_id", renterId)
        .order("id", { ascending: false });

      if (bookingsError) {
        setError(bookingsError.message);
        return;
      }

      setBookings((data ?? []) as RenterBooking[]);
    },
    [supabase],
  );

  const cancelBooking = async (bookingId: string | number) => {
    setError(null);
    setUpdatingBookingId(bookingId);

    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("status", "pending");

    if (cancelError) {
      setError(cancelError.message);
      setUpdatingBookingId(null);
      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "cancelled" } : booking,
      ),
    );
    setUpdatingBookingId(null);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/profile");
        return;
      }

      if (!mounted) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData?.role === "owner") {
        router.replace("/dashboard");
        return;
      }

      setUserEmail(session.user.email ?? "");
      setUserCreatedAt(session.user.created_at ?? "");
      await fetchBookings(session.user.id);
      if (mounted) {
        setLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [fetchBookings, router, supabase]);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="profile" />

      <section className="bg-gradient-to-br from-[#0a2342] via-[#0d3060] to-[#0a4a6b] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            Min profil
          </p>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-tight">Mina bokningar</h1>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto w-full max-w-[1280px] space-y-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
              Konto
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#0a2342]">{userEmail || "-"}</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Medlem sedan{" "}
              {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString("sv-SE") : "-"}
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#9f1239]">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              Hämtar bokningar...
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              Du har inga bokningar ännu.
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
                        {booking.listings?.harbours?.name ?? "Okänd hamn"}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-[#0a2342]">
                        {booking.listings?.title ?? "Okänd plats"}
                      </h3>
                      <p className="mt-1 text-sm text-[#475569]">
                        {booking.listings?.harbours?.city ?? "Okänd stad"}
                      </p>
                      <p className="mt-1 text-sm text-[#475569]">
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </p>
                      <p className="mt-1 text-sm text-[#475569]">
                        {booking.listings?.price_per_season != null
                          ? `${booking.listings.price_per_season.toLocaleString("sv-SE")} SEK / säsong`
                          : "-"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        booking.status === "confirmed"
                          ? "bg-[#dcfce7] text-[#15803d]"
                          : booking.status === "pending"
                            ? "bg-[#fef9c3] text-[#854d0e]"
                            : booking.status === "cancelled"
                              ? "bg-[#e2e8f0] text-[#475569]"
                            : "bg-[#fee2e2] text-[#b91c1c]"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  {booking.status === "pending" ? (
                    <div className="mt-4">
                      <button
                        onClick={() => void cancelBooking(booking.id)}
                        disabled={updatingBookingId === booking.id}
                        className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingBookingId === booking.id ? "Avbokar..." : "Avboka"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
