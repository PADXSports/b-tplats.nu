"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import MapLocationPicker from "@/components/map-location-picker";
import { createClient } from "@/lib/supabase/client";

type DashboardTab = "overview" | "listings" | "bookings" | "profile";
type BookingFilter = "all" | "pending" | "confirmed" | "completed";

type HostListing = {
  id: number | string;
  owner_id: string;
  title: string;
  description: string | null;
  price_per_season: number | null;
  is_available: boolean;
  max_boat_length: number | null;
  max_boat_width: number | null;
  season_start: string | null;
  season_end: string | null;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  harbour_name?: string | null;
};

type HostBooking = {
  id: number | string;
  listing_id: number | string;
  renter_id: string | null;
  guest_email?: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  completed_at?: string | null;
  message?: string | null;
  status: string;
  listings: {
    id: number | string;
    title: string;
    price_per_season: number | null;
  } | null;
  renter_name: string;
  renter_email: string | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ListingFormState = {
  title: string;
  description: string;
  price_per_season: string;
  max_boat_length: string;
  max_boat_width: string;
  season_start: string;
  season_end: string;
  city: string;
  harbour_name: string;
  lat: string;
  lng: string;
};

const COORDINATE_FALLBACKS: Record<
  string,
  { lat: number; lng: number; city: string; harbour_name: string }
> = {
  "Berth A-12": { lat: 59.3293, lng: 18.0686, city: "Stockholm", harbour_name: "Stockholm Marina" },
  "Berth B-3": { lat: 59.318, lng: 18.082, city: "Stockholm", harbour_name: "Stockholm Marina" },
  "South Dock C-08": { lat: 59.335, lng: 18.055, city: "Stockholm", harbour_name: "South Dock" },
  "Brygga A Plats 4": { lat: 59.342, lng: 18.075, city: "Stockholm", harbour_name: "Brygga A" },
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sv-SE");
};

export default function HostDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hostName, setHostName] = useState("Hamnägare");
  const [contactEmail, setContactEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [listings, setListings] = useState<HostListing[]>([]);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [addingListing, setAddingListing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingListing, setEditingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | string | null>(null);
  const [addFormErrors, setAddFormErrors] = useState<Partial<Record<keyof ListingFormState, string>>>({});
  const [addForm, setAddForm] = useState<ListingFormState>({
    title: "",
    description: "",
    price_per_season: "",
    max_boat_length: "",
    max_boat_width: "",
    season_start: "",
    season_end: "",
    city: "",
    harbour_name: "",
    lat: "",
    lng: "",
  });
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [existingEditImageUrl, setExistingEditImageUrl] = useState<string | null>(null);
  const [editImageRemoved, setEditImageRemoved] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ListingFormState>({
    title: "",
    description: "",
    price_per_season: "",
    max_boat_length: "",
    max_boat_width: "",
    season_start: "",
    season_end: "",
    city: "",
    harbour_name: "",
    lat: "",
    lng: "",
  });

  const setField = (field: keyof typeof addForm, value: string) => {
    setAddForm((current) => ({ ...current, [field]: value }));
    setAddFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setEditField = (field: keyof typeof editForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const resetAddFormFields = () => {
    setAddForm({
      title: "",
      description: "",
      price_per_season: "",
      max_boat_length: "",
      max_boat_width: "",
      season_start: "",
      season_end: "",
      city: "",
      harbour_name: "",
      lat: "",
      lng: "",
    });
    setAddFormErrors({});
    setAddImageFile(null);
    setAddImagePreview(null);
  };

  const removeAddImage = () => {
    if (addImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(addImagePreview);
    }
    setAddImageFile(null);
    setAddImagePreview(null);
  };

  const removeEditImage = () => {
    if (editImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageRemoved(true);
  };

  const validateImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showError("Endast bildfiler är tillåtna.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Bilden är för stor. Max storlek är 5MB.");
      return false;
    }
    return true;
  };

  const handleAddImageChange = (file: File | null) => {
    if (!file) return;
    if (!validateImageFile(file)) return;
    if (addImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(addImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setAddImageFile(file);
    setAddImagePreview(previewUrl);
  };

  const handleEditImageChange = (file: File | null) => {
    if (!file) return;
    if (!validateImageFile(file)) return;
    if (editImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setEditImageFile(file);
    setEditImagePreview(previewUrl);
    setEditImageRemoved(false);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const img = document.createElement("img");
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Kunde inte komprimera bilden."));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Kunde inte skapa komprimerad bild."));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.8,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Kunde inte läsa bilden."));
      };

      img.src = objectUrl;
    });
  };

  const extractStorageFileName = (url: string) => {
    try {
      const parsed = new URL(url);
      const fileName = parsed.pathname.split("/").pop();
      return fileName ? decodeURIComponent(fileName) : null;
    } catch {
      return null;
    }
  };

  const deleteImageFromStorage = async (url: string) => {
    const oldFileName = extractStorageFileName(url);
    if (!oldFileName) return;
    const { error } = await supabase.storage.from("listing-images").remove([oldFileName]);
    if (error) {
      throw error;
    }
  };

  const uploadListingImage = async (file: File, ownerId: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${ownerId}-${file.lastModified}.${fileExt}`;
    setImageUploadProgress(15);

    const compressed = await compressImage(file);
    const { error: uploadError } = await supabase
      .storage
      .from("listing-images")
      .upload(fileName, compressed, { contentType: "image/jpeg" });

    if (uploadError) {
      throw uploadError;
    }

    setImageUploadProgress(90);
    const { data: publicData } = supabase.storage.from("listing-images").getPublicUrl(fileName);
    setImageUploadProgress(100);
    return publicData.publicUrl;
  };

  const handleAddMapPick = (picked: { lat: number; lng: number; city?: string }) => {
    setAddForm((current) => ({
      ...current,
      lat: String(picked.lat),
      lng: String(picked.lng),
      city: picked.city ?? current.city,
    }));
  };

  const handleEditMapPick = (picked: { lat: number; lng: number; city?: string }) => {
    setEditForm((current) => ({
      ...current,
      lat: String(picked.lat),
      lng: String(picked.lng),
      city: picked.city ?? current.city,
    }));
  };

  const showSuccess = (message: string) => {
    setError(null);
    setToast({ type: "success", message });
  };

  const showError = (message: string) => {
    setError(message);
    setToast({ type: "error", message });
  };

  const fetchHostProfile = useCallback(async (targetUserId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, phone, description")
      .eq("id", targetUserId)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (profileData?.role !== "host" && profileData?.role !== "owner") {
      localStorage.setItem("userRole", "renter");
      router.replace("/dashboard/renter");
      return null;
    }

    localStorage.setItem("userRole", "host");
    setHostName(profileData.full_name || "Hamnägare");
    setProfileName(profileData.full_name || "");
    setProfilePhone(profileData.phone || "");
    setProfileDescription(profileData.description || "");
    return profileData;
  }, [router, supabase]);

  const fetchListings = useCallback(async (targetUserId: string) => {
    setLoadingListings(true);
    const { data: listingsData, error: listingsError } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", targetUserId)
      .order("id", { ascending: false });

    if (listingsError) {
      setLoadingListings(false);
      throw listingsError;
    }

    const nextListings = (listingsData ?? []) as HostListing[];
    const listingsToBackfill = nextListings.filter(
      (listing) => (listing.lat == null || listing.lng == null) && COORDINATE_FALLBACKS[listing.title],
    );

    if (listingsToBackfill.length > 0) {
      await Promise.all(
        listingsToBackfill.map(async (listing) => {
          const fallback = COORDINATE_FALLBACKS[listing.title];
          const { error: updateError } = await supabase
            .from("listings")
            .update({
              lat: fallback.lat,
              lng: fallback.lng,
              city: listing.city ?? fallback.city,
              harbour_name: listing.harbour_name ?? fallback.harbour_name,
            })
            .eq("id", listing.id);
          if (updateError) {
            console.error(updateError);
            return;
          }
          listing.lat = fallback.lat;
          listing.lng = fallback.lng;
          listing.city = listing.city ?? fallback.city;
          listing.harbour_name = listing.harbour_name ?? fallback.harbour_name;
        }),
      );
    }

    setListings(nextListings);
    setLoadingListings(false);
    return nextListings;
  }, [supabase]);

  const fetchBookings = useCallback(async (listingRows: HostListing[]) => {
    setLoadingBookings(true);
    const listingIds = listingRows.map((listing) => listing.id);

    if (listingIds.length === 0) {
      setBookings([]);
      setLoadingBookings(false);
      return;
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, listing_id, renter_id, guest_email, start_date, end_date, created_at, completed_at, message, status")
      .in("listing_id", listingIds)
      .order("id", { ascending: false });

    if (bookingsError) {
      setLoadingBookings(false);
      throw bookingsError;
    }

    const renterIds = [...new Set((bookingsData ?? []).map((booking) => booking.renter_id).filter(Boolean))] as string[];
    const { data: profilesData, error: profilesError } = renterIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
      : { data: [], error: null };

    if (profilesError) {
      setLoadingBookings(false);
      throw profilesError;
    }

    const listingsById = new Map(listingRows.map((listing) => [String(listing.id), listing]));
    const merged = (bookingsData ?? []).map((booking) => ({
      ...booking,
      listings: listingsById.has(String(booking.listing_id))
        ? {
            id: booking.listing_id,
            title: listingsById.get(String(booking.listing_id))?.title ?? "Okänd annons",
            price_per_season: listingsById.get(String(booking.listing_id))?.price_per_season ?? null,
          }
        : null,
      renter_name:
        profilesData?.find((profile) => profile.id === booking.renter_id)?.full_name ||
        "Okänd gäst",
      renter_email: booking.guest_email ?? null,
    })) as HostBooking[];

    setBookings(merged);
    setLoadingBookings(false);
  }, [supabase]);

  const refreshDashboardData = useCallback(async (targetUserId: string) => {
    const [nextListings] = await Promise.all([fetchListings(targetUserId), fetchHostProfile(targetUserId)]);
    await fetchBookings(nextListings);
  }, [fetchBookings, fetchHostProfile, fetchListings]);

  const updateBookingStatus = async (bookingId: number | string, status: "confirmed" | "declined" | "completed") => {
    setError(null);
    const targetBooking = bookings.find((booking) => booking.id === bookingId) ?? null;
    const payload = status === "completed"
      ? { status, completed_at: new Date().toISOString() }
      : { status };
    const { error: updateError } = await supabase.from("bookings").update(payload).eq("id", bookingId);

    if (updateError) {
      showError(updateError.message);
      return;
    }

    if (status === "confirmed" && targetBooking?.listing_id) {
      const { error: listingError } = await supabase
        .from("listings")
        .update({ is_available: false })
        .eq("id", targetBooking.listing_id);
      if (listingError) {
        showError(listingError.message);
        return;
      }
    }

    if (!userId) return;
    await refreshDashboardData(userId);
    showSuccess(
      status === "confirmed"
        ? "Bokningen är bekräftad."
        : status === "declined"
          ? "Bokningen är avböjd."
          : "Bokningen är markerad som avslutad.",
    );
  };

  const toggleListingAvailability = async (listingId: number | string, currentValue: boolean) => {
    const { error: toggleError } = await supabase
      .from("listings")
      .update({ is_available: !currentValue })
      .eq("id", listingId);

    if (toggleError) {
      showError(toggleError.message);
      return;
    }

    if (!userId) return;
    await refreshDashboardData(userId);
    showSuccess(!currentValue ? "Annons aktiverad." : "Annons pausad.");
  };

  const handleAddListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    if (isSaving) return;
    const requiredFields: (keyof typeof addForm)[] = [
      "title",
      "description",
      "price_per_season",
      "max_boat_length",
      "max_boat_width",
      "season_start",
      "season_end",
      "city",
      "harbour_name",
      "lat",
      "lng",
    ];
    const errors: Partial<Record<keyof typeof addForm, string>> = {};
    requiredFields.forEach((field) => {
      if (!addForm[field].trim()) {
        errors[field] = "Fältet är obligatoriskt";
      }
    });
    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      showError("Fyll i alla obligatoriska fält.");
      return;
    }

    setIsSaving(true);
    setAddingListing(true);
    const timeoutId = setTimeout(() => {
      setAddingListing(false);
      setIsSaving(false);
      showError("Det tog för lång tid att spara annonsen. Försök igen.");
    }, 10000);

    try {
      let imageUrl: string | null = null;
      if (addImageFile) {
        imageUrl = await uploadListingImage(addImageFile, userId);
      }
      const payload = {
        title: addForm.title,
        description: addForm.description || null,
        price_per_season: Number(addForm.price_per_season),
        max_boat_length: Number(addForm.max_boat_length),
        max_boat_width: Number(addForm.max_boat_width),
        season_start: addForm.season_start,
        season_end: addForm.season_end,
        lat: Number(addForm.lat),
        lng: Number(addForm.lng),
        city: addForm.city,
        harbour_name: addForm.harbour_name,
        image_url: imageUrl,
        owner_id: userId,
        is_available: true,
      };

      console.log("Starting insert with data:", payload);

      const { error: insertError } = await supabase.from("listings").insert(payload);

      console.log("Insert result:", { error: insertError });
      if (insertError) {
        throw insertError;
      }

      setShowAddModal(false);
      resetAddFormFields();
      await fetchListings(userId);
      showSuccess("Annons tillagd! ✓");
    } catch (insertError) {
      const message =
        insertError instanceof Error
          ? insertError.message
          : "Kunde inte skapa annonsen. Kontrollera RLS-policy och kolumnnamn.";
      showError(message);
    } finally {
      clearTimeout(timeoutId);
      setAddingListing(false);
      setIsSaving(false);
      setImageUploadProgress(null);
    }
  };

  const openEditListing = (listing: HostListing) => {
    setEditingListingId(listing.id);
    setEditForm({
      title: listing.title ?? "",
      description: listing.description ?? "",
      price_per_season: listing.price_per_season != null ? String(listing.price_per_season) : "",
      max_boat_length: listing.max_boat_length != null ? String(listing.max_boat_length) : "",
      max_boat_width: listing.max_boat_width != null ? String(listing.max_boat_width) : "",
      season_start: listing.season_start ?? "",
      season_end: listing.season_end ?? "",
      city: listing.city ?? "",
      harbour_name: listing.harbour_name ?? "",
      lat: listing.lat != null ? String(listing.lat) : "",
      lng: listing.lng != null ? String(listing.lng) : "",
    });
    setEditImageFile(null);
    setEditImagePreview(listing.image_url ?? null);
    setExistingEditImageUrl(listing.image_url ?? null);
    setEditImageRemoved(false);
    setShowEditModal(true);
  };

  const handleEditListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingListingId || !userId) return;
    setEditingListing(true);
    try {
      let imageUrl = existingEditImageUrl;

      if (editImageRemoved && existingEditImageUrl && !editImageFile) {
        await deleteImageFromStorage(existingEditImageUrl);
        imageUrl = null;
      }

      if (editImageFile) {
        if (existingEditImageUrl) {
          await deleteImageFromStorage(existingEditImageUrl);
        }
        imageUrl = await uploadListingImage(editImageFile, userId);
      }

      const { error: updateError } = await supabase
        .from("listings")
        .update({
          title: editForm.title,
          description: editForm.description || null,
          price_per_season: Number(editForm.price_per_season),
          max_boat_length: Number(editForm.max_boat_length),
          max_boat_width: Number(editForm.max_boat_width),
          season_start: editForm.season_start,
          season_end: editForm.season_end,
          city: editForm.city || null,
          harbour_name: editForm.harbour_name || null,
          lat: editForm.lat ? Number(editForm.lat) : null,
          lng: editForm.lng ? Number(editForm.lng) : null,
          image_url: imageUrl || null,
        })
        .eq("id", editingListingId);

      if (updateError) {
        showError(updateError.message);
        return;
      }

      setShowEditModal(false);
      setEditingListingId(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      setExistingEditImageUrl(null);
      setEditImageRemoved(false);
      await refreshDashboardData(userId);
      showSuccess("Annonsen uppdaterades.");
    } catch (updateListingError) {
      const message =
        updateListingError instanceof Error
          ? updateListingError.message
          : "Kunde inte uppdatera annonsen.";
      showError(message);
    } finally {
      setEditingListing(false);
      setImageUploadProgress(null);
    }
  };

  const deleteListing = async (listingId: number | string) => {
    if (!userId) return;
    const hadConfirmedBookings = bookings.some(
      (booking) => booking.listing_id === listingId && booking.status === "confirmed",
    );
    const confirmed = window.confirm(
      "Är du säker på att du vill ta bort denna annons?\nAlla bokningar kopplade till platsen kommer också att raderas.\nDetta går inte att ångra.",
    );
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from("listings").delete().eq("id", listingId);
    if (deleteError) {
      showError(deleteError.message);
      return;
    }

    await refreshDashboardData(userId);
    if (hadConfirmedBookings) {
      // refreshDashboardData updates both listings and booking-based overview stats.
    }
    showSuccess("Annons borttagen");
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      showError(userError.message);
      setSavingProfile(false);
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/dashboard/host");
      setSavingProfile(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        role: "host",
        full_name: profileName || null,
        phone: profilePhone || null,
        description: profileDescription || null,
      });

    if (saveError) {
      showError(saveError.message);
      setSavingProfile(false);
      return;
    }

    setHostName(profileName || "Hamnägare");
    showSuccess("Profilen uppdaterades.");
    setSavingProfile(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const cachedRole = localStorage.getItem("userRole");
        if (cachedRole === "renter") {
          router.replace("/dashboard/renter");
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login?redirect=/dashboard/host");
          return;
        }

        setUserId(user.id);
        setContactEmail(user.email ?? "");
        setIsAuthenticated(true);
        const [profileResult, nextListings] = await Promise.all([
          fetchHostProfile(user.id),
          fetchListings(user.id),
        ]);
        if (!profileResult) return;
        await fetchBookings(nextListings);
      } catch (initError) {
        console.error(initError);
        if (mounted) {
          showError("Något gick fel – försök igen");
          setLoadingListings(false);
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
  }, [fetchBookings, fetchHostProfile, fetchListings, router, supabase]);

  const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const confirmedBookingsCount = confirmedBookings.length;
  const now = new Date();
  const revenueThisMonth = confirmedBookings.reduce((sum, booking) => {
    if (!booking.created_at || !booking.listings?.price_per_season) return sum;
    const createdAt = new Date(booking.created_at);
    if (createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()) {
      return sum + booking.listings.price_per_season;
    }
    return sum;
  }, 0);
  const allPendingBookings = bookings.filter((booking) => booking.status === "pending");

  const tabParam = searchParams.get("tab");
  const tab: DashboardTab =
    tabParam === "annonser"
      ? "listings"
      : tabParam === "bokningar"
        ? "bookings"
        : tabParam === "profil"
          ? "profile"
          : "overview";

  const filteredBookings = bookings.filter(
    (booking) => bookingFilter === "all" || booking.status === bookingFilter,
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-[#1e293b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#cbd5e1] border-t-[#0d9488]" />
          <p className="text-sm font-medium text-[#64748b]">Laddar dashboard...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <AuthNavbar currentPage="dashboard" />

      <section className="bg-[#0f172a] px-4 py-10 text-white sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#14b8a8]">
            För hamnägare
          </p>
          <h1 className="mt-2 text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">{hostName}</h1>
          <p className="mt-2 text-sm text-white/80">Välkommen tillbaka till din dashboard.</p>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="mb-6 overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="inline-flex min-w-max gap-1">
              {[
                ["overview", "Översikt"],
                ["listings", "Mina Annonser"],
                ["bookings", "Bokningar"],
                ["profile", "Profil"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() =>
                    router.push(
                      value === "overview"
                        ? "/dashboard/host"
                        : value === "listings"
                          ? "/dashboard/host?tab=annonser"
                          : value === "bookings"
                            ? "/dashboard/host?tab=bokningar"
                            : "/dashboard/host?tab=profil",
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    tab === value
                      ? "bg-[#0d9488] text-white"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0a2342]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-[#fecaca] bg-[#fff1f2] p-4 text-sm text-[#9f1239]">
              {error}
            </div>
          ) : null}
          {toast ? (
            <div
              className={`mb-5 rounded-xl p-4 text-sm ${
                toast.type === "success"
                  ? "border border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e]"
                  : "border border-[#fecaca] bg-[#fff1f2] text-[#9f1239]"
              }`}
            >
              {toast.message}
            </div>
          ) : null}

          {tab === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Mina annonser
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#0a2342]">{listings.length}</p>
                </article>
                <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Väntande bokningar
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#0a2342]">{pendingBookings}</p>
                </article>
                <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Bekräftade bokningar
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#0a2342]">{confirmedBookingsCount}</p>
                </article>
                <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                    Intäkter denna månad
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-[#0a2342]">
                    {revenueThisMonth.toLocaleString("sv-SE")} SEK
                  </p>
                </article>
              </div>

              <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                <h3 className="text-lg font-bold text-[#0a2342]">Åtgärd krävs</h3>
                <p className="mt-1 text-sm text-[#64748b]">Alla väntande bokningar.</p>
                <div className="mt-4 space-y-3">
                  {allPendingBookings.length === 0 ? (
                    <p className="text-sm text-[#64748b]">Inga väntande bokningar ✓</p>
                  ) : (
                    allPendingBookings.map((booking) => (
                      <div
                        key={`pending-${booking.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#0a2342]">
                            {booking.renter_name} · {booking.listings?.title ?? "Okänd annons"}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void updateBookingStatus(booking.id, "confirmed")}
                            className="rounded-lg bg-[#0d9488] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#14b8a8]"
                          >
                            Acceptera
                          </button>
                          <button
                            onClick={() => void updateBookingStatus(booking.id, "declined")}
                            className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-1.5 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6]"
                          >
                            Avböj
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          ) : null}

          {tab === "listings" ? (
            loadingListings ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <div
                    key={`listing-skeleton-${idx}`}
                    className="h-20 w-full animate-pulse rounded bg-gray-200"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8]"
                  >
                    + Lägg till ny annons
                  </button>
                </div>
                {listings.length === 0 ? (
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                    Inga annonser hittades för detta konto.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {listings.map((listing) => (
                      <article
                        key={listing.id}
                        className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]"
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="relative h-[60px] w-[60px] overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f1f5f9]">
                            {listing.image_url ? (
                              <Image
                                src={listing.image_url}
                                alt={listing.title}
                                fill
                                className="object-cover"
                                sizes="60px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xl text-[#94a3b8]">
                                📷
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                              {listing.harbour_name ?? "Hamn"}
                            </p>
                            <h2 className="text-lg font-bold text-[#0a2342]">{listing.title}</h2>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-[#475569]">
                          Pris:{" "}
                          {listing.price_per_season != null
                            ? `${listing.price_per_season.toLocaleString("sv-SE")} SEK / säsong`
                            : "-"}
                        </p>
                        <p className="mt-1 text-sm text-[#475569]">
                          Säsong: {formatDate(listing.season_start)} - {formatDate(listing.season_end)}
                        </p>
                        <p className="mt-1 text-sm text-[#475569]">
                          Mått: {listing.max_boat_length ?? "-"}m längd · {listing.max_boat_width ?? "-"}m bredd
                        </p>
                        <p className="mt-1 text-sm">
                          Status:{" "}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              listing.is_available
                                ? "bg-[#dcfce7] text-[#15803d]"
                                : "bg-[#e2e8f0] text-[#475569]"
                            }`}
                          >
                            {listing.is_available ? "Aktiv" : "Pausad"}
                          </span>
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => void toggleListingAvailability(listing.id, listing.is_available)}
                            className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0a2342] transition hover:border-[#0d9488] hover:text-[#0d9488]"
                          >
                            {listing.is_available ? "Pausa" : "Aktivera"}
                          </button>
                          <button
                            onClick={() => openEditListing(listing)}
                            className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0a2342] transition hover:border-[#0d9488] hover:text-[#0d9488]"
                          >
                            Redigera
                          </button>
                          <button
                            onClick={() => void deleteListing(listing.id)}
                            className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6]"
                          >
                            Ta bort
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : null}

          {tab === "bookings" ? (
            loadingBookings ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, idx) => (
                  <div
                    key={`booking-skeleton-${idx}`}
                    className="h-20 w-full animate-pulse rounded bg-gray-200"
                  />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                Inga bokningar ännu.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex flex-wrap rounded-xl border border-[#e2e8f0] bg-white p-1">
                  {[
                    ["all", "Alla"],
                    ["pending", "Väntande"],
                    ["confirmed", "Bekräftade"],
                    ["completed", "Avslutade"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setBookingFilter(value as BookingFilter)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        bookingFilter === value
                          ? "bg-[#0d9488] text-white"
                          : "text-[#64748b] hover:bg-[#f1f5f9]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-[#64748b] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
                    Inga bokningar i vald kategori.
                  </div>
                ) : filteredBookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                          {booking.listings?.title ?? "Okänd annons"}
                        </p>
                        <h3 className="mt-1 text-base font-bold text-[#0a2342]">
                          {booking.renter_name || "Okänd gäst"}
                        </h3>
                        <p className="mt-1 text-sm text-[#475569]">
                          {booking.renter_email ?? "E-post ej tillgänglig"}
                        </p>
                        <p className="mt-1 text-sm text-[#475569]">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                        {booking.message ? (
                          <p className="mt-1 text-sm text-[#475569]">Meddelande: {booking.message}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          booking.status === "confirmed"
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : booking.status === "pending"
                              ? "bg-[#fef9c3] text-[#854d0e]"
                              : booking.status === "completed"
                                ? "bg-[#dbeafe] text-[#1d4ed8]"
                                : "bg-[#fee2e2] text-[#b91c1c]"
                        }`}
                      >
                        {booking.status === "pending"
                          ? "Väntande"
                          : booking.status === "confirmed"
                            ? "Bekräftad"
                            : booking.status === "completed"
                              ? "Avslutad"
                              : "Avböjd"}
                      </span>
                    </div>

                    {booking.status === "pending" ? (
                      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                        <button
                          onClick={() => void updateBookingStatus(booking.id, "confirmed")}
                          className="rounded-lg bg-[#0d9488] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#14b8a8] sm:min-w-[110px]"
                        >
                          Acceptera
                        </button>
                        <button
                          onClick={() => void updateBookingStatus(booking.id, "declined")}
                          className="rounded-lg border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6] sm:min-w-[110px]"
                        >
                          Avböj
                        </button>
                      </div>
                    ) : booking.status === "confirmed" ? (
                      <div className="mt-4">
                        <button
                          onClick={() => void updateBookingStatus(booking.id, "completed")}
                          className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#0a2342] transition hover:border-[#0d9488] hover:text-[#0d9488]"
                        >
                          Markera som avslutad
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )
          ) : null}

          {tab === "profile" ? (
            <article className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                Profil
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Hamnnamn</label>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Kontakt e-post</label>
                  <input
                    value={contactEmail}
                    readOnly
                    className="w-full rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-sm text-[#475569]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Telefon</label>
                  <input
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Beskrivning av hamnen</label>
                  <textarea
                    value={profileDescription}
                    onChange={(event) => setProfileDescription(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                </div>
              </div>
              <article className="mt-5 rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm text-[#64748b]">
                <p className="font-semibold text-[#0a2342]">Betalningsinställningar</p>
                <p className="mt-1">
                  Stripe-integration kommer snart. Du kommer kunna ta emot betalningar direkt via plattformen.
                </p>
                <button
                  type="button"
                  onClick={() => showSuccess("Tack! Vi meddelar dig när Stripe är aktiverat.")}
                  className="mt-3 rounded-lg border border-[#0d9488] px-3 py-2 text-xs font-semibold text-[#0d9488] transition hover:bg-[#0d9488] hover:text-white"
                >
                  Anmäl intresse
                </button>
              </article>
              <button
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="mt-5 rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-70"
              >
                {savingProfile ? "Sparar..." : "Spara profil"}
              </button>
            </article>
          ) : null}
        </div>
      </section>

      {showAddModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a2342]/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white shadow-[0_10px_25px_rgba(0,0,0,0.2)]">
            <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-4 border-b border-[#e2e8f0] bg-white px-6 py-4">
              <div>
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                  Ny annons
                </p>
                <h3 className="text-xl font-extrabold text-[#0a2342]">Lägg till ny annons</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md px-2 py-1 text-sm text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0a2342]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddListing} className="grid gap-4 px-6 pb-0">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Foto på båtplatsen</label>
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#0d9488] p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleAddImageChange(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-2xl">📷</p>
                  <p className="mt-1 text-sm font-semibold text-[#0a2342]">Klicka för att ladda upp bild</p>
                  <p className="mt-1 text-xs text-[#64748b]">Max 5MB</p>
                </label>
                {addImagePreview ? (
                  <div className="relative mt-3 h-36 overflow-hidden rounded-lg border border-[#e2e8f0]">
                    <Image src={addImagePreview} alt="Förhandsvisning" fill className="object-cover" sizes="400px" />
                    <button
                      type="button"
                      onClick={removeAddImage}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#ef4444] text-sm font-bold text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                {imageUploadProgress != null ? (
                  <p className="mt-2 text-xs text-[#0d9488]">Uppladdning: {imageUploadProgress}%</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Hamnnamn</label>
                <input
                  value={addForm.harbour_name}
                  onChange={(event) => setField("harbour_name", event.target.value)}
                  placeholder="Hamnnamn"
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                {addFormErrors.harbour_name ? (
                  <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.harbour_name}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Titel på platsen</label>
                <input
                  value={addForm.title}
                  onChange={(event) => setField("title", event.target.value)}
                  placeholder="Titel"
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                {addFormErrors.title ? <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.title}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Stad</label>
                <input
                  value={addForm.city}
                  onChange={(event) => setField("city", event.target.value)}
                  placeholder="Stad"
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                {addFormErrors.city ? <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.city}</p> : null}
              </div>
              <div className="rounded-lg border border-[#e2e8f0] p-3">
                <p className="mb-2 text-sm font-semibold text-[#0a2342]">Plats på karta</p>
                <MapLocationPicker
                  lat={addForm.lat ? Number(addForm.lat) : null}
                  lng={addForm.lng ? Number(addForm.lng) : null}
                  onPick={handleAddMapPick}
                  height="220px"
                />
                <p className="mt-2 text-xs text-[#64748b]">
                  📍 {addForm.lat || "59.3293"}, {addForm.lng || "18.0686"} — {addForm.city || "Stockholm"}
                </p>
                {(addFormErrors.lat || addFormErrors.lng) ? (
                  <p className="mt-1 text-xs text-[#b91c1c]">Välj en plats på kartan</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Beskrivning</label>
                <textarea
                  value={addForm.description}
                  onChange={(event) => setField("description", event.target.value)}
                  placeholder="Beskrivning"
                  rows={3}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                {addFormErrors.description ? (
                  <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.description}</p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Pris per säsong (SEK)</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.price_per_season}
                    onChange={(event) => setField("price_per_season", event.target.value)}
                    placeholder="Pris per säsong (SEK)"
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                  {addFormErrors.price_per_season ? (
                    <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.price_per_season}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Max båtlängd (meter)</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.max_boat_length}
                    onChange={(event) => setField("max_boat_length", event.target.value)}
                    placeholder="Max båtlängd (m)"
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                  {addFormErrors.max_boat_length ? (
                    <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.max_boat_length}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Max båtbredd (meter)</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.max_boat_width}
                    onChange={(event) => setField("max_boat_width", event.target.value)}
                    placeholder="Max båtbred (m)"
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                  {addFormErrors.max_boat_width ? (
                    <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.max_boat_width}</p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Säsong start</label>
                  <input
                    type="date"
                    value={addForm.season_start}
                    onChange={(event) => setField("season_start", event.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                  {addFormErrors.season_start ? (
                    <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.season_start}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Säsong slut</label>
                  <input
                    type="date"
                    value={addForm.season_end}
                    onChange={(event) => setField("season_end", event.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                  />
                  {addFormErrors.season_end ? (
                    <p className="mt-1 text-xs text-[#b91c1c]">{addFormErrors.season_end}</p>
                  ) : null}
                </div>
              </div>
              <div className="sticky bottom-0 -mx-6 border-t border-[#e2e8f0] bg-white px-6 py-4">
                <button
                  type="submit"
                  disabled={addingListing}
                  className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-70"
                >
                  {addingListing ? "Sparar..." : "Spara annons"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0a2342]/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white shadow-[0_10px_25px_rgba(0,0,0,0.2)]">
            <div className="sticky top-0 z-10 mb-4 flex items-start justify-between gap-4 border-b border-[#e2e8f0] bg-white px-6 py-4">
              <div>
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">
                  Redigera annons
                </p>
                <h3 className="text-xl font-extrabold text-[#0a2342]">Uppdatera annons</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-md px-2 py-1 text-sm text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0a2342]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditListing} className="grid gap-4 px-6 pb-0">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#0a2342]">Foto på båtplatsen</label>
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#0d9488] p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleEditImageChange(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-2xl">📷</p>
                  <p className="mt-1 text-sm font-semibold text-[#0a2342]">Klicka för att ladda upp bild</p>
                  <p className="mt-1 text-xs text-[#64748b]">Max 5MB</p>
                </label>
                {editImagePreview ? (
                  <div className="relative mt-3 h-36 overflow-hidden rounded-lg border border-[#e2e8f0]">
                    <Image src={editImagePreview} alt="Förhandsvisning" fill className="object-cover" sizes="400px" />
                    <button
                      type="button"
                      onClick={removeEditImage}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#ef4444] text-sm font-bold text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                {imageUploadProgress != null ? (
                  <p className="mt-2 text-xs text-[#0d9488]">Uppladdning: {imageUploadProgress}%</p>
                ) : null}
              </div>
              <input
                value={editForm.harbour_name}
                onChange={(event) => setEditField("harbour_name", event.target.value)}
                placeholder="Hamnnamn"
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
              <input
                value={editForm.title}
                onChange={(event) => setEditField("title", event.target.value)}
                placeholder="Titel"
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
              <input
                value={editForm.city}
                onChange={(event) => setEditField("city", event.target.value)}
                placeholder="Stad"
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
              <div className="rounded-lg border border-[#e2e8f0] p-3">
                <p className="mb-2 text-sm font-semibold text-[#0a2342]">Plats på karta</p>
                <MapLocationPicker
                  lat={editForm.lat ? Number(editForm.lat) : null}
                  lng={editForm.lng ? Number(editForm.lng) : null}
                  onPick={handleEditMapPick}
                  height="220px"
                />
                <p className="mt-2 text-xs text-[#64748b]">
                  📍 {editForm.lat || "59.3293"}, {editForm.lng || "18.0686"} — {editForm.city || "Stockholm"}
                </p>
              </div>
              <textarea
                value={editForm.description}
                onChange={(event) => setEditField("description", event.target.value)}
                placeholder="Beskrivning"
                rows={3}
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  value={editForm.price_per_season}
                  onChange={(event) => setEditField("price_per_season", event.target.value)}
                  placeholder="Pris per säsong (SEK)"
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                <input
                  type="number"
                  min={0}
                  value={editForm.max_boat_length}
                  onChange={(event) => setEditField("max_boat_length", event.target.value)}
                  placeholder="Max båtlängd (m)"
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                <input
                  type="number"
                  min={0}
                  value={editForm.max_boat_width}
                  onChange={(event) => setEditField("max_boat_width", event.target.value)}
                  placeholder="Max båtbredd (m)"
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="date"
                  value={editForm.season_start}
                  onChange={(event) => setEditField("season_start", event.target.value)}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
                <input
                  type="date"
                  value={editForm.season_end}
                  onChange={(event) => setEditField("season_end", event.target.value)}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm outline-none transition focus:border-[#0d9488]"
                />
              </div>
              <div className="sticky bottom-0 -mx-6 border-t border-[#e2e8f0] bg-white px-6 py-4">
                <button
                  type="submit"
                  disabled={editingListing}
                  className="w-full rounded-lg bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14b8a8] disabled:opacity-70"
                >
                  {editingListing ? "Sparar..." : "Spara ändringar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
