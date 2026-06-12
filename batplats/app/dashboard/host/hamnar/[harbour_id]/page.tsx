"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DASHBOARD_TEAL } from "@/components/dashboard-icons";
import {
  HOST_DANGER_BTN,
  HOST_INPUT_CLASS,
  HOST_LOADING_FALLBACK,
  HOST_PRIMARY_BTN,
  HOST_SECONDARY_BTN,
  HostDashboardShell,
  HostToast,
  hostCardClass,
} from "@/components/host-dashboard-shell";
import RentalTypeChoice from "@/components/RentalTypeChoice";
import { StarRating } from "@/components/StarRating";
import { isBookedBookingStatus } from "@/lib/booking-status";
import { createClient } from "@/lib/supabase/client";
import { normalizeRentalType } from "@/lib/rental-type";

type Tab = "listings" | "bookings" | "reviews" | "info";

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
  rental_type?: string | null;
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

type HarbourReview = {
  id: string;
  harbour_id: string | number;
  rating: number;
  comment: string | null;
  host_response: string | null;
  created_at: string;
  reviewer_name: string;
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
  rental_type: "season" | "flexible";
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
  rental_type: "season",
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
  if (isBookedBookingStatus(status)) return { label: "Bekräftad", classes: "bg-[#dff5ea] text-[#2d9e6b]" };
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
  const [reviews, setReviews] = useState<HarbourReview[]>([]);
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

    const listingTitleById = new Map(listingRows.map((listing) => [String(listing.id), listing.title]));

    const { data: bookingRows, error: bookingError } = await supabase
      .from("bookings")
      .select("id, listing_id, status, start_date, end_date, guest_email, renter_id")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false });

    if (bookingError) {
      setToast({ type: "error", message: "Kunde inte hämta bokningar." });
      return;
    }

    const renterIds = [
      ...new Set(
        ((bookingRows ?? []) as Array<{ renter_id: string | null }>)
          .map((row) => row.renter_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const profileById = new Map<string, { full_name: string | null }>();
    if (renterIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", renterIds);
      if (profileError) {
        console.error("Failed to fetch renter profiles for harbour bookings:", profileError);
      } else {
        for (const profile of profiles ?? []) {
          profileById.set(String(profile.id), {
            full_name: (profile.full_name as string | null) ?? null,
          });
        }
      }
    }

    const normalized: Booking[] = ((bookingRows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const renterId = (row.renter_id as string | null) ?? null;
      const renterProfile = renterId ? profileById.get(renterId) : null;
      const listingId = row.listing_id as string | number;
      const listingTitle = listingTitleById.get(String(listingId)) ?? "Okänd plats";

      return {
        id: row.id as string | number,
        listing_id: listingId,
        status: (row.status as string) ?? "pending",
        start_date: (row.start_date as string | null) ?? null,
        end_date: (row.end_date as string | null) ?? null,
        guest_email: (row.guest_email as string | null) ?? null,
        listings: {
          id: listingId,
          title: listingTitle,
        },
        renter: renterProfile
          ? {
              full_name: renterProfile.full_name,
              email: null,
            }
          : null,
      };
    });

    setBookings(normalized);
  };

  const fetchReviews = async (listingRows: Listing[]) => {
    void listingRows;

    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("*")
      .eq("harbour_id", harbourId)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      setToast({ type: "error", message: "Kunde inte hämta omdömen." });
      return;
    }

    if (!reviewsData || reviewsData.length === 0) {
      setReviews([]);
      return;
    }

    const reviewerIds = reviewsData.map((r) => r.reviewer_id);
    const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", reviewerIds);

    const normalized: HarbourReview[] = reviewsData.map((review) => ({
      id: review.id,
      harbour_id: review.harbour_id,
      rating: review.rating,
      comment: review.comment,
      host_response: review.host_response,
      created_at: review.created_at,
      reviewer_name: profilesData?.find((p) => p.id === review.reviewer_id)?.full_name || "Anonym",
    }));

    setReviews(normalized);
  };

  const respondToReview = async (reviewId: string, response: string) => {
    const { error } = await supabase.from("reviews").update({ host_response: response }).eq("id", reviewId);

    if (error) {
      setToast({ type: "error", message: "Kunde inte spara svar." });
      return;
    }

    setToast({ type: "success", message: "Svar sparat." });
    await fetchReviews(listings);
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
        "id, harbour_id, title, description, image_url, price_per_season, max_boat_length, max_boat_width, season_start, season_end, rental_type, is_available",
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
    await fetchReviews(typedListings);
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
      rental_type: normalizeRentalType(listing.rental_type),
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
      rental_type: listingForm.rental_type,
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
    <HostDashboardShell
      activeNav="hamnar"
      pageTitle={harbour?.name ?? "Hamn"}
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/dashboard/host/hamnar")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Tillbaka till hamnar
        </button>
      }
    >
      <p className="-mt-4 mb-6 text-sm text-gray-500">{harbour?.city ?? "-"}</p>

      <HostToast toast={toast} />

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-gray-200/60 p-1">
        {[
          ["listings", "Platser"],
          ["bookings", "Bokningar"],
          ["reviews", "Omdömen"],
          ["info", "Hamninfo"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value as Tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className={`${hostCardClass} p-5 text-sm text-gray-500`}>Laddar...</div> : null}

        {!loading && activeTab === "listings" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/dashboard/host/listings/ny")}
                className={HOST_PRIMARY_BTN}
                style={{ background: DASHBOARD_TEAL }}
              >
                Lägg till ny plats
              </button>
            </div>
            {listings.length === 0 ? (
              <p className={`${hostCardClass} p-4 text-sm text-gray-500`}>Inga platser registrerade ännu.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {listings.map((listing) => (
                  <article key={listing.id} className={`${hostCardClass} p-4`}>
                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-sm text-gray-500">
                      {listing.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.image_url} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        "Ingen bild"
                      )}
                    </div>
                    <p className="mt-3 font-bold text-gray-900">{listing.title}</p>
                    <p className="text-xs text-gray-500">{formatPrice(listing.price_per_season)}</p>
                    <p className="text-xs text-gray-500">
                      Max: {listing.max_boat_length ?? "-"} m längd · {listing.max_boat_width ?? "-"} m bredd
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${
                        listing.is_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {listing.is_available ? "Tillgänglig" : "Inte tillgänglig"}
                    </span>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/host/listings/${listing.id}/redigera`)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Redigera
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteListing(listing.id)}
                        disabled={deletingListingId === listing.id}
                        className={`${HOST_DANGER_BTN} text-xs`}
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
              <p className={`${hostCardClass} p-4 text-sm text-gray-500`}>Inga bokningar för denna hamn.</p>
            ) : (
              bookings.map((booking) => {
                const status = bookingStatus(booking.status);
                return (
                  <article key={booking.id} className={`${hostCardClass} p-4`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{booking.listings?.title ?? "Okänd plats"}</p>
                        <p className="text-xs text-gray-500">
                          Hyresgäst: {booking.renter?.full_name || "Okänd"} ({booking.renter?.email || booking.guest_email || "Ingen e-post"})
                        </p>
                        <p className="text-xs text-gray-500">
                          Datum: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${status.classes}`}>{status.label}</span>
                        {booking.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void setBookingStatus(booking.id, "confirmed")}
                              disabled={updatingBookingId === booking.id}
                              className={`${HOST_PRIMARY_BTN} px-3 py-2 text-xs`}
                              style={{ background: DASHBOARD_TEAL }}
                            >
                              Godkänn
                            </button>
                            <button
                              type="button"
                              onClick={() => void setBookingStatus(booking.id, "declined")}
                              disabled={updatingBookingId === booking.id}
                              className={`${HOST_DANGER_BTN} text-xs`}
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

        {!loading && activeTab === "reviews" ? (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className={`${hostCardClass} p-4 text-sm text-gray-500`}>Inga omdömen för denna hamn ännu.</p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className={`${hostCardClass} p-4`}>
                  <p className="font-semibold text-gray-900">{review.reviewer_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString("sv-SE", {
                      year: "numeric",
                      month: "long",
                    })}
                  </p>
                  <div className="mt-2">
                    <StarRating rating={review.rating} readonly size="sm" />
                  </div>
                  {review.comment ? <p className="mt-2 text-sm text-gray-700">{review.comment}</p> : null}
                  <div className="mt-3">
                    {review.host_response ? (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-gray-500">Ditt svar:</p>
                        <p className="text-sm text-gray-700">{review.host_response}</p>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Svara på detta omdöme..."
                          className={`${HOST_INPUT_CLASS} flex-1 py-2 text-sm`}
                          id={`response-${review.id}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`response-${review.id}`) as HTMLInputElement;
                            if (input.value) void respondToReview(review.id, input.value);
                          }}
                          className={HOST_PRIMARY_BTN}
                          style={{ background: DASHBOARD_TEAL }}
                        >
                          Svara
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}

        {!loading && activeTab === "info" ? (
          <div className={`${hostCardClass} p-5`}>
            <h2 className="text-lg font-bold text-gray-900">Hamninformation</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Namn</dt>
                <dd className="font-semibold text-gray-900">{harbour?.name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Stad</dt>
                <dd className="font-semibold text-gray-900">{harbour?.city ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Latitud</dt>
                <dd className="font-semibold text-gray-900">{harbour?.lat ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Longitud</dt>
                <dd className="font-semibold text-gray-900">{harbour?.lng ?? "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Beskrivning</dt>
                <dd className="whitespace-pre-wrap font-semibold text-gray-900">{harbour?.description || "-"}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setShowHarbourEditModal(true)}
              className={`${HOST_SECONDARY_BTN} mt-4 px-4 py-2`}
            >
              Redigera hamninfo
            </button>
          </div>
        ) : null}

      {showListingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${hostCardClass} w-full max-w-2xl p-5`}>
            <h2 className="text-xl font-bold text-gray-900">{listingForm.id ? "Redigera plats" : "Skapa ny plats"}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Uthyrningstyp</p>
                <RentalTypeChoice
                  value={listingForm.rental_type}
                  onChange={(rental_type) => setListingForm((prev) => ({ ...prev, rental_type }))}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={listingForm.title}
                onChange={(e) => setListingForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titel"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={listingForm.price_per_season}
                onChange={(e) => setListingForm((prev) => ({ ...prev, price_per_season: e.target.value }))}
                placeholder="Pris / säsong"
                type="number"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={listingForm.max_boat_length}
                onChange={(e) => setListingForm((prev) => ({ ...prev, max_boat_length: e.target.value }))}
                placeholder="Max längd (m)"
                type="number"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={listingForm.max_boat_width}
                onChange={(e) => setListingForm((prev) => ({ ...prev, max_boat_width: e.target.value }))}
                placeholder="Max bredd (m)"
                type="number"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={listingForm.season_start}
                onChange={(e) => setListingForm((prev) => ({ ...prev, season_start: e.target.value }))}
                type="date"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={listingForm.season_end}
                onChange={(e) => setListingForm((prev) => ({ ...prev, season_end: e.target.value }))}
                type="date"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={listingForm.image_url}
                onChange={(e) => setListingForm((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="Bild-URL (valfritt)"
                className={`${HOST_INPUT_CLASS} sm:col-span-2`}
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
                className={`${HOST_INPUT_CLASS} sm:col-span-2`}
              />
              <textarea
                value={listingForm.description}
                onChange={(e) => setListingForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className={`${HOST_INPUT_CLASS} sm:col-span-2 min-h-24`}
              />
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
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
                type="button"
                onClick={() => setShowListingModal(false)}
                className={HOST_SECONDARY_BTN}
                disabled={savingListing}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void saveListing()}
                disabled={savingListing}
                className={HOST_PRIMARY_BTN}
                style={{ background: DASHBOARD_TEAL }}
              >
                {savingListing ? "Sparar..." : listingForm.id ? "Spara ändringar" : "Skapa plats"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showHarbourEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${hostCardClass} w-full max-w-xl p-5`}>
            <h2 className="text-xl font-bold text-gray-900">Redigera hamninfo</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={harbourForm.name}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Namn"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={harbourForm.city}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Stad"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={harbourForm.lat}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, lat: e.target.value }))}
                placeholder="Latitud"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={harbourForm.lng}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, lng: e.target.value }))}
                placeholder="Longitud"
                className={HOST_INPUT_CLASS}
              />
              <textarea
                value={harbourForm.description}
                onChange={(e) => setHarbourForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className={`${HOST_INPUT_CLASS} sm:col-span-2 min-h-28`}
              />
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
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
                type="button"
                onClick={() => setShowHarbourEditModal(false)}
                className={HOST_SECONDARY_BTN}
                disabled={savingHarbour}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void saveHarbourInfo()}
                className={HOST_PRIMARY_BTN}
                style={{ background: DASHBOARD_TEAL }}
                disabled={savingHarbour}
              >
                {savingHarbour ? "Sparar..." : "Spara"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </HostDashboardShell>
  );
}

export default function HarbourDetailPage() {
  return (
    <Suspense fallback={HOST_LOADING_FALLBACK}>
      <HarbourDetailContent />
    </Suspense>
  );
}
