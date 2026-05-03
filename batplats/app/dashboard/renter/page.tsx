"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createClient } from "@/lib/supabase/client";

type RenterBooking = {
  id: number | string;
  listing_id: number | string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  stripe_session_id: string | null;
  listings: {
    title: string;
    harbour_name: string | null;
    city: string | null;
    price_per_season: number | null;
    image_url: string | null;
  } | null;
};

type DashboardTab = "active" | "pending" | "history";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

const normalizeStatus = (status: string) => {
  if (status === "confirmed") {
    return { label: "Bekräftad", classes: "bg-[#dff5ea] text-[#2d9e6b]" };
  }
  if (status === "pending") {
    return { label: "Väntande", classes: "bg-[#fef9c3] text-[#854d0e]" };
  }
  if (status === "declined") {
    return { label: "Avböjd", classes: "bg-[#fee2e2] text-[#d64c3b]" };
  }
  if (status === "cancelled") {
    return { label: "Avbokad", classes: "bg-[#dce3ee] text-[#6b7a8f]" };
  }
  return { label: status, classes: "bg-[#dce3ee] text-[#6b7a8f]" };
};

function RenterDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<RenterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("active");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [contactBooking, setContactBooking] = useState<RenterBooking | null>(null);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const infoMessage = searchParams.get("message");

  const showSuccess = (message: string) => setToast({ type: "success", message });
  const showError = (message: string) => setToast({ type: "error", message });

  const fetchBookings = useCallback(
    async (userId: string, userEmail: string) => {
      const trimmedEmail = userEmail.trim();
      const orFilter =
        trimmedEmail.length > 0
          ? `renter_id.eq.${userId},guest_email.eq."${trimmedEmail.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
          : `renter_id.eq.${userId}`;

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*, listings(title, harbour_name, city, price_per_season, image_url)")
        .or(orFilter)
        .order("created_at", { ascending: false });

      console.log("Bookings query result:", bookings, error);
      console.log("Query params:", userId, userEmail);

      if (error) {
        setError(error.message);
        setLoadingBookings(false);
        return;
      }

      const normalizedBookings: RenterBooking[] = ((bookings ?? []) as Array<Record<string, unknown>>).map(
        (booking) => {
          const listingRelation = Array.isArray(booking.listings)
            ? (booking.listings[0] as Record<string, unknown> | undefined)
            : (booking.listings as Record<string, unknown> | null | undefined);

          return {
            id: booking.id as number | string,
            listing_id: booking.listing_id as number | string,
            status: (booking.status as string) ?? "pending",
            start_date: (booking.start_date as string | null) ?? null,
            end_date: (booking.end_date as string | null) ?? null,
            stripe_session_id: (booking.stripe_session_id as string | null) ?? null,
            listings: listingRelation
              ? {
                  title: (listingRelation.title as string) ?? "Okänd annons",
                  harbour_name: (listingRelation.harbour_name as string | null) ?? null,
                  city: (listingRelation.city as string | null) ?? null,
                  price_per_season: (listingRelation.price_per_season as number | null) ?? null,
                  image_url: (listingRelation.image_url as string | null) ?? null,
                }
              : null,
          };
        },
      );

      setBookings(normalizedBookings);
      setLoadingBookings(false);
    },
    [supabase],
  );

  const fetchProfile = useCallback(
    async (id: string) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          setFullName("");
          setPhone("");
          return;
        }
        throw profileError;
      }

      setFullName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
    },
    [supabase],
  );

  const cancelBooking = async (bookingId: string | number) => {
    const confirmCancel = window.confirm("Är du säker på att du vill avboka?");
    if (!confirmCancel || !userId) {
      return;
    }

    setError(null);
    setUpdatingBookingId(bookingId);

    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("status", "pending");

    if (cancelError) {
      setError(cancelError.message);
      showError("Kunde inte avboka bokningen");
      setUpdatingBookingId(null);
      return;
    }

    await fetchBookings(userId, userEmail);
    showSuccess("Bokning avbokad");
    setUpdatingBookingId(null);
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    setError(null);

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    });

    if (profileError) {
      setError(profileError.message);
      showError("Kunde inte spara profiluppgifter");
      setSavingProfile(false);
      return;
    }

    showSuccess("Profilen har uppdaterats");
    setSavingProfile(false);
  };

  const submitContact = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      showError("Fyll i ämne och meddelande");
      return;
    }
    setSendingMessage(true);
    setTimeout(() => {
      setSendingMessage(false);
      setContactBooking(null);
      setContactSubject("");
      setContactMessage("");
      showSuccess("Meddelande skickat! (E-post kommer snart)");
    }, 500);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const cachedRole = localStorage.getItem("userRole");
        if (cachedRole === "host") {
          router.replace("/dashboard/host");
          return;
        }

        const {
          data: { user },
          error: sessionError,
        } = await supabase.auth.getUser();

        if (sessionError) {
          throw sessionError;
        }

        if (!user?.id) {
          router.replace("/login?redirect=/dashboard/renter");
          return;
        }
        console.log("Current user:", user.id, user.email);
        setUserId(user.id);
        setUserEmail(user.email ?? "");
        setAuthUser(user);

        let { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            role: "renter",
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "",
          });
          if (insertError) {
            throw insertError;
          }
          profileData = { role: "renter" };
        }

        if (profileData?.role === "owner" || profileData?.role === "host") {
          localStorage.setItem("userEmail", user.email ?? "");
          localStorage.setItem("userRole", "host");
          router.replace("/dashboard/host");
          return;
        }
        localStorage.setItem("userEmail", user.email ?? "");
        localStorage.setItem("userRole", profileData?.role ?? "renter");

        await Promise.all([fetchBookings(user.id, user.email ?? ""), fetchProfile(user.id)]);
      } catch (initError) {
        console.error(initError);
        if (mounted) {
          setError("Något gick fel - försök igen");
          setLoadingBookings(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [fetchBookings, fetchProfile, router, supabase]);

  const greetingName = useMemo(() => {
    const meta = authUser?.user_metadata as { full_name?: string; name?: string } | undefined;
    return (
      fullName.trim() ||
      meta?.full_name ||
      meta?.name ||
      authUser?.email?.split("@")[0] ||
      "du"
    );
  }, [fullName, authUser]);

  const filteredBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === "pending") {
      return bookings.filter((booking) => booking.status === "pending");
    }
    if (activeTab === "history") {
      return bookings.filter((booking) => {
        if (booking.status === "cancelled" || booking.status === "declined") return true;
        const endDate = booking.end_date ? new Date(booking.end_date) : null;
        return Boolean(endDate && !Number.isNaN(endDate.getTime()) && endDate < today);
      });
    }
    return bookings.filter((booking) => booking.status === "confirmed");
  }, [activeTab, bookings]);

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#0f1f3d]">
      <AuthNavbar currentPage="profile" />

      <section className="bg-[#0f1f3d] px-4 py-10 text-white sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a6]">
            Välkommen tillbaka
          </p>
          <h1 className="mt-2 text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            Hej, {greetingName}!
          </h1>
          <p className="mt-2 text-sm text-white/80">Här är dina bokningar och kontoinformation</p>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-[1280px] space-y-6">
          {toast ? (
            <div
              className={`rounded-xl border p-4 text-sm ${
                toast.type === "success"
                  ? "border-[#99f6e4] bg-[#f0fdfa] text-[#0d9488]"
                  : "border-[#fecaca] bg-[#fff1f2] text-[#d64c3b]"
              }`}
            >
              {toast.message}
            </div>
          ) : null}
          {infoMessage ? (
            <div className="rounded-xl border border-[#99f6e4] bg-[#f0fdfa] p-4 text-sm text-[#0d9488]">
              {infoMessage}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#d64c3b]">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "active", label: "Aktiva bokningar" },
              { id: "pending", label: "Väntande" },
              { id: "history", label: "Historik" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#0d9488] text-white"
                    : "bg-white text-[#4a5568] hover:bg-[#ebe6dc]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading || loadingBookings ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={`renter-booking-skeleton-${idx}`}
                  className="h-20 w-full animate-pulse rounded bg-gray-200"
                />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              <p className="text-3xl">⚓</p>
              <p className="mt-3 text-sm text-[#8a96a8]">Du har inga bokningar ännu</p>
              <Link
                href="/kajplatser"
                className="mt-4 inline-flex cursor-pointer rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a6] hover:shadow-md"
              >
                Hitta en båtplats
              </Link>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-[#dce3ee] bg-white p-6 text-sm text-[#8a96a8] shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]">
              Inga bokningar i vald kategori.
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-xl border border-[#dce3ee] bg-white p-5 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)] sm:p-6"
                >
                  <div className="flex flex-wrap gap-4">
                    <div className="relative h-24 w-full overflow-hidden rounded-lg bg-gradient-to-br from-[#c5d0de] to-[#dce3ee] sm:w-40 sm:shrink-0">
                      {booking.listings?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={booking.listings.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-[220px] flex-1">
                      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                        {booking.listings?.harbour_name ?? "Okänd hamn"}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-[#0f1f3d]">
                        {booking.listings?.title ?? "Okänd plats"}
                      </h3>
                      <p className="mt-1 text-sm text-[#6b7a8f]">
                        {booking.listings?.city ?? "Okänd stad"}
                      </p>
                      <p className="mt-1 text-sm text-[#6b7a8f]">
                        Bokning: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#0f1f3d]">
                        {booking.listings?.price_per_season
                          ? `${booking.listings.price_per_season.toLocaleString("sv-SE")} SEK / säsong`
                          : "Pris ej angivet"}
                      </p>
                    </div>
                    <div className="flex h-fit flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${normalizeStatus(booking.status).classes}`}
                      >
                        {normalizeStatus(booking.status).label}
                      </span>
                      {booking.stripe_session_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#dff5ea] px-2.5 py-1 text-xs font-semibold text-[#16a34a]">
                          <span aria-hidden>✓</span> Betald
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#fef9c3] px-2.5 py-1 text-xs font-semibold text-[#ca8a04]">
                          Ej betald
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/listings/${booking.listing_id}`}
                      className="inline-flex cursor-pointer rounded-lg border border-[#0d9488] px-3 py-2 text-sm font-semibold text-[#0d9488] transition hover:bg-[#0d9488] hover:text-white hover:shadow-md"
                    >
                      Visa annons
                    </Link>
                    {booking.status === "confirmed" ? (
                      <button
                        type="button"
                        onClick={() => setContactBooking(booking)}
                        className="inline-flex rounded-lg border border-[#c5d0de] px-3 py-2 text-sm font-semibold text-[#0f1f3d] transition hover:border-[#0d9488] hover:text-[#0d9488]"
                      >
                        Kontakta hamnägare
                      </button>
                    ) : null}
                    {booking.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => void cancelBooking(booking.id)}
                        disabled={updatingBookingId === booking.id}
                        className="inline-flex rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-[#d64c3b] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingBookingId === booking.id ? "Avbokar..." : "Avboka"}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="rounded-xl border border-[#dce3ee] bg-white p-5 shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)] sm:p-6">
            <h2 className="text-lg font-extrabold text-[#0f1f3d]">Mina uppgifter</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">E-post</label>
                <input
                  type="email"
                  value={userEmail}
                  readOnly
                  className="w-full rounded-lg border border-[#c5d0de] bg-[#f5f0e8] px-3 py-2 text-sm text-[#6b7a8f]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Namn</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Telefon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="mt-4 rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:opacity-60"
            >
              {savingProfile ? "Sparar..." : "Spara"}
            </button>
          </section>
        </div>
      </section>

      {contactBooking ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f1f3d]/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#dce3ee] bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.5px] text-[#0d9488]">
                  Kontakta hamnägare
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-[#0f1f3d]">
                  {contactBooking.listings?.title ?? "Meddelande"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setContactBooking(null)}
                className="rounded-md px-2 py-1 text-sm text-[#8a96a8] transition hover:bg-[#ebe6dc] hover:text-[#0f1f3d]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Ämne</label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(event) => setContactSubject(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0f1f3d]">Meddelande</label>
                <textarea
                  rows={5}
                  value={contactMessage}
                  onChange={(event) => setContactMessage(event.target.value)}
                  className="w-full rounded-lg border border-[#c5d0de] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
              <button
                type="button"
                onClick={submitContact}
                disabled={sendingMessage}
                className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a6] disabled:opacity-60"
              >
                {sendingMessage ? "Skickar..." : "Skicka meddelande"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function RenterDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0f1f3d]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c5d0de] border-t-[#0d9488]" />
            <p className="text-sm font-medium text-[#8a96a8]">Laddar dashboard...</p>
          </div>
        </main>
      }
    >
      <RenterDashboardContent />
    </Suspense>
  );
}
