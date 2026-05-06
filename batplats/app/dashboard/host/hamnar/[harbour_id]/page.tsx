"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createClient } from "@/lib/supabase/client";

type Tab = "listings" | "bookings" | "info";

type Harbour = {
  id: string | number;
  owner_id: string | null;
  name: string | null;
  city: string | null;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_active?: boolean | null;
};

type Listing = {
  id: string | number;
  harbour_id: string | number | null;
  title: string;
  description: string | null;
  image_url: string | null;
  price_per_season: number | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  season_start: string | null;
  season_end: string | null;
  is_available: boolean;
};

type Booking = {
  id: string | number;
  listing_id: string | number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  guest_email: string | null;
  listings: { id: string | number; title: string } | null;
  renter: { full_name: string | null; email: string | null } | null;
};

type ListingForm = {
  id: string | number | null;
  title: string;
  description: string;
  price_per_season: string;
  max_boat_length: string;
  max_boat_width: string;
  season_start: string;
  season_end: string;
  is_available: boolean;
  image_url: string;
  image_file: File | null;
};

const emptyListingForm: ListingForm = {
  id: null,
  title: "",
  description: "",
  price_per_season: "",
  max_boat_length: "",
  max_boat_width: "",
  season_start: "",
  season_end: "",
  is_available: true,
  image_url: "",
  image_file: null,
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

const formatPrice = (value: number | null) => `${(value ?? 0).toLocaleString("sv-SE")} SEK / säsong`;

const bookingStatus = (status: string) => {
  if (status === "pending") return { label: "Väntande", classes: "bg-[#fef9c3] text-[#854d0e]" };
  if (status === "confirmed") return { label: "Bekräftad", classes: "bg-[#dff5ea] text-[#2d9e6b]" };
  if (status === "declined") return { label: "Avböjd", classes: "bg-[#fee2e2] text-[#d64c3b]" };
  return { label: status, classes: "bg-[#dce3ee] text-[#6b7a8f]" };
};

function HarbourDetailContent() {
  const params = useParams<{ harbour_id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const harbourId = params.harbour_id;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("listings");
  const [harbour, setHarbour] = useState<Harbour | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingForm, setListingForm] = useState<ListingForm>(emptyListingForm);
  const [savingListing, setSavingListing] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<string | number | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | number | null>(null);
  const [showHarbourEditModal, setShowHarbourEditModal] = useState(false);
  const [harbourForm, setHarbourForm] = useState({ name: "", city: "", description: "", lat: "", lng: "", is_active: true });
  const [savingHarbour, setSavingHarbour] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const fetchBookings = async (listingRows: Listing[]) => {
    const listingIds = listingRows.map((l) => l.id);
    if (listingIds.length === 0) {
      setBookings([]);
      return;
    }

    const { data: bookingRows, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, listing_id, status, start_date, end_date, guest_email, listings(title), renter:profiles!bookings_renter_id_fkey(full_name, email)",
      )
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });

    if (bookingError) {
      setToast({ type: "error", message: "Kunde inte hämta bokningar." });
      return;
    }

    const normalized: Booking[] = ((bookingRows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const listingRelation = Array.isArray(row.listings)
        ? (row.listings[0] as Record<string, unknown> | undefined)
        : (row.listings as Record<string, unknown> | null | undefined);
      const renterRelation = Array.isArray(row.renter)
        ? (row.renter[0] as Record<string, unknown> | undefined)
        : (row.renter as Record<string, unknown> | null | undefined);

      return {
        id: row.id as string | number,
        listing_id: row.listing_id as string | number,
        status: (row.status as string) ?? "pending",
        start_date: (row.start_date as string | null) ?? null,
        end_date: (row.end_date as string | null) ?? null,
        guest_email: (row.guest_email as string | null) ?? null,
        listings: listingRelation
          ? {
              id: row.listing_id as string | number,
              title: (listingRelation.title as string) ?? "Okänd plats",
            }
          : null,
        renter: renterRelation
          ? {
              full_name: (renterRelation.full_name as string | null) ?? null,
              email: (renterRelation.email as string | null) ?? null,
            }
          : null,
      };
    });

    setBookings(normalized);
  };

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?redirect=/dashboard/host/hamnar/${harbourId}`);
      return;
    }

    const { data: harbourRow, error: harbourError } = await supabase.from("harbours").select("*").eq("id", harbourId).maybeSingle();
    if (harbourError || !harbourRow) {
      setToast({ type: "error", message: "Hamn hittades inte." });
      router.replace("/dashboard/host/hamnar");
      return;
    }

    const typedHarbour = harbourRow as Harbour;
    if (typedHarbour.owner_id !== user.id) {
      setToast({ type: "error", message: "Du har inte tillgång till denna hamn." });
      router.replace("/dashboard/host/hamnar");
      return;
    }

    setHarbour(typedHarbour);
    setHarbourForm({
      name: typedHarbour.name ?? "",
      city: typedHarbour.city ?? "",
      description: typedHarbour.description ?? "",
      lat: typedHarbour.lat != null ? String(typedHarbour.lat) : "",
      lng: typedHarbour.lng != null ? String(typedHarbour.lng) : "",
      is_active: typedHarbour.is_active ?? true,
    });

    const { data: listingRows, error: listingError } = await supabase
      .from("listings")
      .select(
        "id, harbour_id, title, description, image_url, price_per_season, max_boat_length, max_boat_width, season_start, season_end, is_available",
      )
      .eq("harbour_id", harbourId)
      .order("created_at", { ascending: false });

    if (listingError) {
      setToast({ type: "error", message: "Kunde inte hämta platser." });
      setLoading(false);
      return;
    }

    const typedListings = (listingRows ?? []) as Listing[];
    setListings(typedListings);
    await fetchBookings(typedListings);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harbourId, router, supabase]);

  const uploadListingImage = async (file: File) => {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      throw uploadError;
    }
    const { data } = supabase.storage.from("listing-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const openCreateListing = () => {
    setListingForm(emptyListingForm);
    setShowListingModal(true);
  };

  const openEditListing = (listing: Listing) => {
    setListingForm({
      id: listing.id,
      title: listing.title,
      description: listing.description ?? "",
      price_per_season: listing.price_per_season != null ? String(listing.price_per_season) : "",
      max_boat_length: listing.max_boat_length != null ? String(listing.max_boat_length) : "",
      max_boat_width: listing.max_boat_width != null ? String(listing.max_boat_width) : "",
      season_start: listing.season_start ?? "",
      season_end: listing.season_end ?? "",
      is_available: listing.is_available,
      image_url: listing.image_url ?? "",
      image_file: null,
    });
    setShowListingModal(true);
  };

  const saveListing = async () => {
    if (!listingForm.title.trim()) {
      setToast({ type: "error", message: "Titel krävs." });
      return;
    }

    setSavingListing(true);
    let imageUrl = listingForm.image_url.trim() || null;
    if (listingForm.image_file) {
      try {
        imageUrl = await uploadListingImage(listingForm.image_file);
      } catch {
        setToast({ type: "error", message: "Bilduppladdning misslyckades." });
        setSavingListing(false);
        return;
      }
    }

    const payload: Record<string, string | number | boolean | null> = {
      harbour_id: harbourId,
      title: listingForm.title.trim(),
      description: listingForm.description.trim() || null,
      price_per_season: listingForm.price_per_season.trim() ? Number(listingForm.price_per_season) : null,
      max_boat_length: listingForm.max_boat_length.trim() ? Number(listingForm.max_boat_length) : null,
      max_boat_width: listingForm.max_boat_width.trim() ? Number(listingForm.max_boat_width) : null,
      season_start: listingForm.season_start || null,
      season_end: listingForm.season_end || null,
      is_available: listingForm.is_available,
      image_url: imageUrl,
    };

    if (listingForm.id) {
      const { error } = await supabase.from("listings").update(payload).eq("id", listingForm.id);
      if (error) {
        setToast({ type: "error", message: "Kunde inte uppdatera plats." });
        setSavingListing(false);
        return;
      }
      setToast({ type: "success", message: "Platsen uppdaterades." });
    } else {
      const { error } = await supabase.from("listings").insert(payload);
      if (error) {
        setToast({ type: "error", message: "Kunde inte skapa plats." });
        setSavingListing(false);
        return;
      }
      setToast({ type: "success", message: "Ny plats skapad." });
    }

    setShowListingModal(false);
    setListingForm(emptyListingForm);
    await loadData();
    setSavingListing(false);
  };

  const deleteListing = async (listingId: string | number) => {
    if (!window.confirm("Vill du ta bort platsen?")) return;

    setDeletingListingId(listingId);
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (error) {
      setToast({ type: "error", message: "Kunde inte ta bort platsen." });
      setDeletingListingId(null);
      return;
    }

    setToast({ type: "success", message: "Platsen togs bort." });
    await loadData();
    setDeletingListingId(null);
  };

  const setBookingStatus = async (bookingId: string | number, status: "confirmed" | "declined") => {
    setUpdatingBookingId(bookingId);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) {
      setToast({ type: "error", message: "Kunde inte uppdatera bokningsstatus." });
      setUpdatingBookingId(null);
      return;
    }
    setToast({ type: "success", message: status === "confirmed" ? "Bokning godkänd." : "Bokning avvisad." });
    await loadData();
    setUpdatingBookingId(null);
  };

  const saveHarbourInfo = async () => {
    if (!harbour) return;
    if (!harbourForm.name.trim() || !harbourForm.city.trim()) {
      setToast({ type: "error", message: "Namn och stad krävs." });
      return;
    }

    setSavingHarbour(true);
    const payload: Record<string, string | number | boolean | null> = {
      name: harbourForm.name.trim(),
      city: harbourForm.city.trim(),
      description: harbourForm.description.trim() || null,
      lat: harbourForm.lat.trim() ? Number(harbourForm.lat) : null,
      lng: harbourForm.lng.trim() ? Number(harbourForm.lng) : null,
      is_active: harbourForm.is_active,
    };

    const { error } = await supabase.from("harbours").update(payload).eq("id", harbour.id);
    if (error) {
      setToast({ type: "error", message: "Kunde inte spara hamninfo." });
      setSavingHarbour(false);
      return;
    }

    setToast({ type: "success", message: "Hamninfo uppdaterad." });
    setShowHarbourEditModal(false);
    await loadData();
    setSavingHarbour(false);
  };

  return (
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={() => router.push("/dashboard/host/hamnar")} className="text-sm text-white/70 hover:text-white">
              ← Tillbaka till hamnar
            </button>
            <h1 className="mt-1 text-2xl font-extrabold">{harbour?.name ?? "Hamn"}</h1>
            <p className="text-sm text-white/70">{harbour?.city ?? "-"}</p>
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

        <div className="mb-6 flex gap-2 rounded-xl bg-[#122a5d] p-1">
          {[
            ["listings", "Platser"],
            ["bookings", "Bokningar"],
            ["info", "Hamninfo"],
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

        {!loading && activeTab === "listings" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => router.push("/dashboard/host/listings/ny")}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f]"
              >
                Lägg till ny plats
              </button>
            </div>
            {listings.length === 0 ? (
              <p className="rounded-xl bg-[#122a5d] p-4 text-sm text-white/70">Inga platser registrerade ännu.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {listings.map((listing) => (
                  <article key={listing.id} className="rounded-xl bg-[#122a5d] p-4">
                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-[#0b1b3f] text-sm text-white/60">
                      {listing.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.image_url} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        "Ingen bild"
                      )}
                    </div>
                    <p className="mt-3 font-bold">{listing.title}</p>
                    <p className="text-xs text-white/70">{formatPrice(listing.price_per_season)}</p>
                    <p className="text-xs text-white/70">
                      Max: {listing.max_boat_length ?? "-"} m längd · {listing.max_boat_width ?? "-"} m bredd
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                        listing.is_available ? "bg-[#dff5ea] text-[#2d9e6b]" : "bg-[#dce3ee] text-[#6b7a8f]"
                      }`}
                    >
                      {listing.is_available ? "Tillgänglig" : "Inte tillgänglig"}
                    </span>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/host/listings/${listing.id}/redigera`)}
                        className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => void deleteListing(listing.id)}
                        disabled={deletingListingId === listing.id}
                        className="rounded-lg border border-[#d64c3b]/60 px-3 py-2 text-xs font-semibold text-[#fca5a5] disabled:opacity-50"
                      >
                        {deletingListingId === listing.id ? "Tar bort..." : "Ta bort"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!loading && activeTab === "bookings" ? (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <p className="rounded-xl bg-[#122a5d] p-4 text-sm text-white/70">Inga bokningar för denna hamn.</p>
            ) : (
              bookings.map((booking) => {
                const status = bookingStatus(booking.status);
                return (
                  <article key={booking.id} className="rounded-xl bg-[#122a5d] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{booking.listings?.title ?? "Okänd plats"}</p>
                        <p className="text-xs text-white/70">
                          Hyresgäst: {booking.renter?.full_name || "Okänd"} ({booking.renter?.email || booking.guest_email || "Ingen e-post"})
                        </p>
                        <p className="text-xs text-white/70">
                          Datum: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${status.classes}`}>{status.label}</span>
                        {booking.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => void setBookingStatus(booking.id, "confirmed")}
                              disabled={updatingBookingId === booking.id}
                              className="rounded-lg bg-[#14b8a6] px-3 py-2 text-xs font-semibold text-[#0b1b3f] disabled:opacity-50"
                            >
                              Godkänn
                            </button>
                            <button
                              onClick={() => void setBookingStatus(booking.id, "declined")}
                              disabled={updatingBookingId === booking.id}
                              className="rounded-lg border border-[#d64c3b]/60 px-3 py-2 text-xs font-semibold text-[#fca5a5] disabled:opacity-50"
                            >
                              Avvisa
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : null}

        {!loading && activeTab === "info" ? (
          <div className="rounded-xl bg-[#122a5d] p-5">
            <h2 className="text-lg font-bold">Hamninformation</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-white/70">Namn</dt>
                <dd className="font-semibold">{harbour?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-white/70">Stad</dt>
                <dd className="font-semibold">{harbour?.city ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-white/70">Latitud</dt>
                <dd className="font-semibold">{harbour?.lat ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-white/70">Longitud</dt>
                <dd className="font-semibold">{harbour?.lng ?? "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-white/70">Beskrivning</dt>
                <dd className="whitespace-pre-wrap font-semibold">{harbour?.description || "-"}</dd>
              </div>
            </dl>
            <button
              onClick={() => setShowHarbourEditModal(true)}
              className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold"
            >
              Redigera hamninfo
            </button>
          </div>
        ) : null}
      </section>

      {showListingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#10234f] p-5">
            <h2 className="text-xl font-bold">{listingForm.id ? "Redigera plats" : "Skapa ny plats"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={listingForm.title}
                onChange={(e) => setListingForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titel"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={listingForm.price_per_season}
                onChange={(e) => setListingForm((prev) => ({ ...prev, price_per_season: e.target.value }))}
                placeholder="Pris / säsong"
                type="number"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={listingForm.max_boat_length}
                onChange={(e) => setListingForm((prev) => ({ ...prev, max_boat_length: e.target.value }))}
                placeholder="Max längd (m)"
                type="number"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={listingForm.max_boat_width}
                onChange={(e) => setListingForm((prev) => ({ ...prev, max_boat_width: e.target.value }))}
                placeholder="Max bredd (m)"
                type="number"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={listingForm.season_start}
                onChange={(e) => setListingForm((prev) => ({ ...prev, season_start: e.target.value }))}
                type="date"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={listingForm.season_end}
                onChange={(e) => setListingForm((prev) => ({ ...prev, season_end: e.target.value }))}
                type="date"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={listingForm.image_url}
                onChange={(e) => setListingForm((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="Bild-URL (valfritt)"
                className="sm:col-span-2 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setListingForm((prev) => ({
                    ...prev,
                    image_file: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null,
                  }))
                }
                className="sm:col-span-2 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <textarea
                value={listingForm.description}
                onChange={(e) => setListingForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className="sm:col-span-2 min-h-24 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={listingForm.is_available}
                  onChange={(e) => setListingForm((prev) => ({ ...prev, is_available: e.target.checked }))}
                />
                Tillgänglig för bokning
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowListingModal(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm"
                disabled={savingListing}
              >
                Avbryt
              </button>
              <button
                onClick={() => void saveListing()}
                disabled={savingListing}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f] disabled:opacity-50"
              >
                {savingListing ? "Sparar..." : listingForm.id ? "Spara ändringar" : "Skapa plats"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showHarbourEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#10234f] p-5">
            <h2 className="text-xl font-bold">Redigera hamninfo</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={harbourForm.name}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Namn"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={harbourForm.city}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Stad"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={harbourForm.lat}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, lat: e.target.value }))}
                placeholder="Latitud"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={harbourForm.lng}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, lng: e.target.value }))}
                placeholder="Longitud"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <textarea
                value={harbourForm.description}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className="sm:col-span-2 min-h-28 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={harbourForm.is_active}
                  onChange={(e) => setHarbourForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Aktiv hamn
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowHarbourEditModal(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm"
                disabled={savingHarbour}
              >
                Avbryt
              </button>
              <button
                onClick={() => void saveHarbourInfo()}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f] disabled:opacity-50"
                disabled={savingHarbour}
              >
                {savingHarbour ? "Sparar..." : "Spara"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function HarbourDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1b3f]" />}>
      <HarbourDetailContent />
    </Suspense>
  );
}
