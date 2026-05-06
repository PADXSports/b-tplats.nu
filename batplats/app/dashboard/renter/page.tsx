"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import BookingCard, { type BookingCardBooking } from "@/components/BookingCard";
import { createClient } from "@/lib/supabase/client";

type Tab = "bookings" | "profile";

type Profile = {
  full_name: string | null;
  boat_name: string | null;
  boat_length: number | null;
  boat_width: number | null;
};

const toDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

function RenterDashboardContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<BookingCardBooking[]>([]);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    boat_name: "",
    boat_length: "",
    boat_width: "",
  });

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadBookings = async (id: string) => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, status, start_date, end_date, listing_id, renter_id, guest_email, listings(title, price_per_season, harbours(name, city))",
      )
      .eq("renter_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      setToast({ type: "error", message: "Kunde inte hämta bokningar." });
      return;
    }

    const normalized: BookingCardBooking[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const listingRelation = Array.isArray(row.listings)
        ? (row.listings[0] as Record<string, unknown> | undefined)
        : (row.listings as Record<string, unknown> | null | undefined);
      const harbourRelation = listingRelation
        ? (Array.isArray(listingRelation.harbours)
            ? (listingRelation.harbours[0] as Record<string, unknown> | undefined)
            : (listingRelation.harbours as Record<string, unknown> | null | undefined))
        : null;

      return {
        id: row.id as string | number,
        status: (row.status as "pending" | "confirmed" | "declined" | "cancelled") ?? "pending",
        start_date: (row.start_date as string | null) ?? null,
        end_date: (row.end_date as string | null) ?? null,
        listings: listingRelation
          ? {
              title: (listingRelation.title as string) ?? "Okänd plats",
              price_per_season: (listingRelation.price_per_season as number | null) ?? null,
              harbours: harbourRelation
                ? {
                    name: (harbourRelation.name as string | null) ?? null,
                    city: (harbourRelation.city as string | null) ?? null,
                  }
                : null,
            }
          : null,
        renter: null,
        guest_email: (row.guest_email as string | null) ?? null,
      };
    });

    setBookings(normalized);
  };

  const loadProfile = async (id: string, fallbackEmail: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, boat_name, boat_length, boat_width")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setToast({ type: "error", message: "Kunde inte hämta profil." });
      return;
    }

    const profile = (data ?? null) as Profile | null;
    setProfileForm({
      full_name: profile?.full_name ?? "",
      boat_name: profile?.boat_name ?? "",
      boat_length: profile?.boat_length != null ? String(profile.boat_length) : "",
      boat_width: profile?.boat_width != null ? String(profile.boat_width) : "",
    });

    if (!profile) {
      await supabase.from("profiles").upsert({
        id,
        email: fallbackEmail || null,
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/dashboard/renter");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");
      await Promise.all([loadBookings(user.id), loadProfile(user.id, user.email ?? "")]);
      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const cancelPendingBooking = async (bookingId: string | number) => {
    if (!window.confirm("Vill du avboka denna förfrågan?")) return;
    setCancellingBookingId(bookingId);

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("status", "pending");

    if (error) {
      setToast({ type: "error", message: "Kunde inte avboka bokningen." });
      setCancellingBookingId(null);
      return;
    }

    if (userId) {
      await loadBookings(userId);
    }
    setToast({ type: "success", message: "Bokning avbokad." });
    setCancellingBookingId(null);
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email: email || null,
      full_name: profileForm.full_name.trim() || null,
      boat_name: profileForm.boat_name.trim() || null,
      boat_length: profileForm.boat_length.trim() ? Number(profileForm.boat_length) : null,
      boat_width: profileForm.boat_width.trim() ? Number(profileForm.boat_width) : null,
    });

    if (error) {
      setToast({ type: "error", message: "Kunde inte spara profil." });
      setSavingProfile(false);
      return;
    }

    setToast({ type: "success", message: "Profilen uppdaterades." });
    setSavingProfile(false);
  };

  const now = new Date();
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingBookings = bookings.filter((b) => b.status === "confirmed" && (() => {
    const endDate = toDate(b.end_date);
    return endDate ? endDate >= now : true;
  })());
  const pastBookings = bookings.filter((b) => {
    if (b.status === "declined" || b.status === "cancelled") return true;
    const endDate = toDate(b.end_date);
    return endDate ? endDate < now : false;
  });

  return (
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#14b8a6]">Renter dashboard</p>
          <h1 className="text-2xl font-extrabold">Min dashboard</h1>
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

        <div className="mb-6 flex gap-2 rounded-xl bg-[#122a5d] p-1">
          {[
            ["bookings", "Mina Bokningar"],
            ["profile", "Min Profil"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActiveTab(value as Tab)}
              className={`rounded-lg px-4 py-2 text-sm ${activeTab === value ? "bg-[#14b8a6] text-[#0b1b3f]" : "text-white/80"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="rounded-xl bg-[#122a5d] p-5 text-sm text-white/70">Laddar...</div> : null}

        {!loading && activeTab === "bookings" ? (
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-lg font-bold">Kommande bokningar</h2>
              <div className="space-y-3">
                {upcomingBookings.length === 0 ? (
                  <p className="rounded-xl bg-[#122a5d] p-4 text-sm text-white/70">Inga kommande bokningar.</p>
                ) : (
                  upcomingBookings.map((booking) => <BookingCard key={booking.id} booking={booking} mode="renter" />)
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">Väntande förfrågningar</h2>
              <div className="space-y-3">
                {pendingBookings.length === 0 ? (
                  <p className="rounded-xl bg-[#122a5d] p-4 text-sm text-white/70">Inga väntande förfrågningar.</p>
                ) : (
                  pendingBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      mode="renter"
                      onCancel={() => void cancelPendingBooking(booking.id)}
                      busy={cancellingBookingId === booking.id}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">Tidigare bokningar</h2>
              <div className="space-y-3">
                {pastBookings.length === 0 ? (
                  <p className="rounded-xl bg-[#122a5d] p-4 text-sm text-white/70">Ingen historik ännu.</p>
                ) : (
                  pastBookings.map((booking) => <BookingCard key={booking.id} booking={booking} mode="renter" />)
                )}
              </div>
            </section>
          </div>
        ) : null}

        {!loading && activeTab === "profile" ? (
          <div className="max-w-2xl rounded-xl bg-[#122a5d] p-5">
            <h2 className="text-lg font-bold">Min Profil</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={profileForm.full_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Fullständigt namn"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={email}
                readOnly
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm text-white/70"
              />
              <input
                value={profileForm.boat_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, boat_name: e.target.value }))}
                placeholder="Båtnamn (valfritt)"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={profileForm.boat_length}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, boat_length: e.target.value }))}
                type="number"
                placeholder="Båtlängd (m)"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={profileForm.boat_width}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, boat_width: e.target.value }))}
                type="number"
                placeholder="Båtbredd (m)"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f] disabled:opacity-50"
              >
                {savingProfile ? "Sparar..." : "Spara ändringar"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function RenterDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b1b3f] flex items-center justify-center">
          <p className="text-white">Laddar...</p>
        </main>
      }
    >
      <RenterDashboardContent />
    </Suspense>
  );
}
