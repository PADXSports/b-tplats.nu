"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import AuthNavbar from "@/components/auth-navbar";
import MapLocationPicker from "@/components/map-location-picker";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: number | string;
  title: string;
  description?: string | null;
  is_available: boolean;
  harbour_id: number | string | null;
  price_per_season: number | null;
  max_boat_length?: number | null;
  max_boat_width?: number | null;
  season_start?: string | null;
  season_end?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};
type Booking = { id: number | string; listing_id: number | string; created_at: string | null; status: string; listings: { title: string; harbour_id: number | string | null; price_per_season: number | null } | null };
type Harbour = {
  id: number | string;
  name: string | null;
  city: string | null;
  address?: string | null;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_active?: boolean | null;
};

type Tab = "overview" | "listings" | "bookings";
type NewListingForm = {
  harbour_id: string;
  title: string;
  description: string;
  price_per_season: string;
  max_boat_length: string;
  max_boat_width: string;
  season_start: string;
  season_end: string;
};
type DuplicateListingForm = NewListingForm & {
  createMultiple: boolean;
  copyCount: string;
};
type ListingsSort =
  | "created_at_desc"
  | "title_asc"
  | "title_desc"
  | "price_asc"
  | "price_desc"
  | "number";

export default function HarbourDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ harbour_id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [harbour, setHarbour] = useState<Harbour | null>(null);
  const [ownerHarbours, setOwnerHarbours] = useState<Harbour[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [showEditListingModal, setShowEditListingModal] = useState(false);
  const [showDuplicateListingModal, setShowDuplicateListingModal] = useState(false);
  const [showEditHarbourModal, setShowEditHarbourModal] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [listingsSortBy, setListingsSortBy] = useState<ListingsSort>("created_at_desc");
  const [newListingCreateMultiple, setNewListingCreateMultiple] = useState(false);
  const [newListingCopyCount, setNewListingCopyCount] = useState("2");
  const [newListingProgress, setNewListingProgress] = useState<{ current: number; total: number } | null>(null);
  const [editingListing, setEditingListing] = useState(false);
  const [duplicatingListing, setDuplicatingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | string | null>(null);
  const [duplicatingListingId, setDuplicatingListingId] = useState<number | string | null>(null);
  const [duplicateProgress, setDuplicateProgress] = useState<{ current: number; total: number } | null>(null);
  const [savingHarbour, setSavingHarbour] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [listingImageFile, setListingImageFile] = useState<File | null>(null);
  const [editListingImageFile, setEditListingImageFile] = useState<File | null>(null);
  const [existingEditImageUrl, setExistingEditImageUrl] = useState<string | null>(null);
  const [editHarbourForm, setEditHarbourForm] = useState({
    name: "",
    city: "",
    address: "",
    description: "",
    lat: "",
    lng: "",
  });
  const [newListingForm, setNewListingForm] = useState<NewListingForm>({
    harbour_id: "",
    title: "",
    description: "",
    price_per_season: "",
    max_boat_length: "",
    max_boat_width: "",
    season_start: "",
    season_end: "",
  });
  const [editListingForm, setEditListingForm] = useState<NewListingForm>({
    harbour_id: "",
    title: "",
    description: "",
    price_per_season: "",
    max_boat_length: "",
    max_boat_width: "",
    season_start: "",
    season_end: "",
  });
  const [duplicateListingForm, setDuplicateListingForm] = useState<DuplicateListingForm>({
    harbour_id: "",
    title: "",
    description: "",
    price_per_season: "",
    max_boat_length: "",
    max_boat_width: "",
    season_start: "",
    season_end: "",
    createMultiple: false,
    copyCount: "2",
  });

  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "annonser" ? "listings" : tabParam === "bokningar" ? "bookings" : "overview";

  const uploadListingImage = async (file: File, ownerId: string) => {
    const fileExt = file.name.split(".").pop() ?? "jpg";
    const fileName = `${ownerId}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase
      .storage
      .from("listing-images")
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const load = useCallback(async () => {
    const harbourId = params.harbour_id;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user?.id) {
      router.replace("/hamnar/logga-in");
      return;
    }
    const { data: harbourRow } = await supabase
      .from("harbours")
      .select("id, name, city, address, description, lat, lng, is_active")
      .eq("id", harbourId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!harbourRow) {
      router.replace("/dashboard/host/hamnar");
      return;
    }
    const nextHarbour = harbourRow as Harbour;
    setHarbour(nextHarbour);
    setEditHarbourForm({
      name: nextHarbour.name ?? "",
      city: nextHarbour.city ?? "",
      address: nextHarbour.address ?? "",
      description: nextHarbour.description ?? "",
      lat: nextHarbour.lat != null ? String(nextHarbour.lat) : "",
      lng: nextHarbour.lng != null ? String(nextHarbour.lng) : "",
    });
    const { data: harbourRows } = await supabase
      .from("harbours")
      .select("id, name, city")
      .eq("owner_id", user.id)
      .order("name", { ascending: true });
    setOwnerHarbours((harbourRows ?? []) as Harbour[]);
    setNewListingForm((current) => ({ ...current, harbour_id: String(harbourId) }));

    const { data: listingRows } = await supabase
      .from("listings")
      .select("id, title, description, is_available, harbour_id, price_per_season, max_boat_length, max_boat_width, season_start, season_end, image_url, created_at")
      .eq("owner_id", user.id)
      .eq("harbour_id", harbourId)
      .order("created_at", { ascending: false });
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
            const found = listingMap.get(String(b.listing_id));
            return found ? { title: found.title, harbour_id: found.harbour_id, price_per_season: found.price_per_season } : null;
          })(),
        })),
      );
    } else {
      setBookings([]);
    }

    setLoading(false);
  }, [params.harbour_id, router, supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("batplats.listingsSort");
    if (!stored) return;
    const allowed: ListingsSort[] = ["created_at_desc", "title_asc", "title_desc", "price_asc", "price_desc", "number"];
    if (allowed.includes(stored as ListingsSort)) {
      setListingsSortBy(stored as ListingsSort);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("batplats.listingsSort", listingsSortBy);
  }, [listingsSortBy]);

  const sortedListings = useMemo(() => {
    const sorted = [...listings];
    switch (listingsSortBy) {
      case "created_at_desc":
        return sorted.sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        );
      case "title_asc":
        return sorted.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "sv"));
      case "title_desc":
        return sorted.sort((a, b) => (b.title ?? "").localeCompare(a.title ?? "", "sv"));
      case "price_asc":
        return sorted.sort((a, b) => (a.price_per_season ?? Number.POSITIVE_INFINITY) - (b.price_per_season ?? Number.POSITIVE_INFINITY));
      case "price_desc":
        return sorted.sort((a, b) => (b.price_per_season ?? Number.NEGATIVE_INFINITY) - (a.price_per_season ?? Number.NEGATIVE_INFINITY));
      case "number":
        return sorted.sort((a, b) => {
          const numA = parseInt(a.title.match(/\d+/)?.[0] || "0", 10);
          const numB = parseInt(b.title.match(/\d+/)?.[0] || "0", 10);
          return numA - numB;
        });
      default:
        return sorted;
    }
  }, [listings, listingsSortBy]);

  const createListingForHarbour = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingListing) return;
    setSavingListing(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user?.id) {
      alert("Du måste vara inloggad för att skapa en annons.");
      setSavingListing(false);
      return;
    }

    if (
      !newListingForm.title.trim() ||
      !newListingForm.price_per_season.trim() ||
      !newListingForm.max_boat_length.trim() ||
      !newListingForm.max_boat_width.trim() ||
      !newListingForm.season_start ||
      !newListingForm.season_end
    ) {
      alert("Fyll i alla obligatoriska fält.");
      setSavingListing(false);
      return;
    }

    try {
      const totalListingsToCreate = newListingCreateMultiple
        ? Math.min(50, Math.max(1, Number(newListingCopyCount || "1")))
        : 1;
      if (newListingCreateMultiple) {
        const confirmed = window.confirm(`Skapa ${totalListingsToCreate} identiska platser?`);
        if (!confirmed) {
          setSavingListing(false);
          return;
        }
      }
      let imageUrl: string | null = null;
      if (listingImageFile) {
        imageUrl = await uploadListingImage(listingImageFile, user.id);
      }
      const selectedHarbour = ownerHarbours.find((h) => String(h.id) === (newListingForm.harbour_id || String(params.harbour_id))) ?? harbour;
      const cleanTitle = newListingForm.title.trim();
      for (let i = 1; i <= totalListingsToCreate; i += 1) {
        if (totalListingsToCreate > 1) {
          setNewListingProgress({ current: i, total: totalListingsToCreate });
        }
        const title = totalListingsToCreate > 1 ? `${cleanTitle} ${i}` : cleanTitle;
        const { error } = await supabase.from("listings").insert({
          owner_id: user.id,
          harbour_id: newListingForm.harbour_id || params.harbour_id,
          title,
          description: newListingForm.description.trim() || null,
          price_per_season: Number(newListingForm.price_per_season),
          max_boat_length: Number(newListingForm.max_boat_length),
          max_boat_width: Number(newListingForm.max_boat_width),
          season_start: newListingForm.season_start,
          season_end: newListingForm.season_end,
          city: selectedHarbour?.city ?? null,
          harbour_name: selectedHarbour?.name ?? null,
          image_url: imageUrl,
          is_available: true,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setShowAddListingModal(false);
      setListingImageFile(null);
      setNewListingCreateMultiple(false);
      setNewListingCopyCount("2");
      setNewListingProgress(null);
      setNewListingForm({
        harbour_id: String(params.harbour_id),
        title: "",
        description: "",
        price_per_season: "",
        max_boat_length: "",
        max_boat_width: "",
        season_start: "",
        season_end: "",
      });
      setToast(totalListingsToCreate > 1 ? `${totalListingsToCreate} platser skapade!` : "Plats skapad!");
      setTimeout(() => setToast(null), 2500);
      router.push(`/dashboard/host/hamnar/${params.harbour_id}?tab=annonser`);
      await load();
    } catch (createError) {
      console.error(createError);
      setNewListingProgress(null);
      alert(createError instanceof Error ? createError.message : "Kunde inte skapa annonsen.");
    } finally {
      setSavingListing(false);
    }
  };

  const updateHarbourInfo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!harbour || savingHarbour) return;
    setSavingHarbour(true);
    const lat = Number(editHarbourForm.lat);
    const lng = Number(editHarbourForm.lng);
    const { error } = await supabase
      .from("harbours")
      .update({
        name: editHarbourForm.name.trim(),
        city: editHarbourForm.city.trim(),
        address: editHarbourForm.address.trim() || null,
        description: editHarbourForm.description.trim() || null,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      })
      .eq("id", harbour.id);
    if (error) {
      alert(`Kunde inte uppdatera hamn: ${error.message}`);
      setSavingHarbour(false);
      return;
    }
    alert("Hamn uppdaterad!");
    setShowEditHarbourModal(false);
    setSavingHarbour(false);
    await load();
  };

  const openEditListing = (listing: Listing) => {
    setEditingListingId(listing.id);
    setExistingEditImageUrl(listing.image_url ?? null);
    setEditListingImageFile(null);
    setEditListingForm({
      harbour_id: listing.harbour_id != null ? String(listing.harbour_id) : String(params.harbour_id),
      title: listing.title ?? "",
      description: listing.description ?? "",
      price_per_season: listing.price_per_season != null ? String(listing.price_per_season) : "",
      max_boat_length: listing.max_boat_length != null ? String(listing.max_boat_length) : "",
      max_boat_width: listing.max_boat_width != null ? String(listing.max_boat_width) : "",
      season_start: listing.season_start ?? "",
      season_end: listing.season_end ?? "",
    });
    setShowEditListingModal(true);
  };

  const saveEditedListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingListingId || editingListing) return;
    setEditingListing(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user?.id) throw new Error("Inte inloggad.");
      let imageUrl = existingEditImageUrl;
      if (editListingImageFile) {
        imageUrl = await uploadListingImage(editListingImageFile, user.id);
      }
      const selectedHarbour = ownerHarbours.find((h) => String(h.id) === editListingForm.harbour_id) ?? harbour;
      const { error } = await supabase
        .from("listings")
        .update({
          harbour_id: editListingForm.harbour_id,
          title: editListingForm.title.trim(),
          description: editListingForm.description.trim() || null,
          price_per_season: Number(editListingForm.price_per_season),
          max_boat_length: Number(editListingForm.max_boat_length),
          max_boat_width: Number(editListingForm.max_boat_width),
          season_start: editListingForm.season_start,
          season_end: editListingForm.season_end,
          harbour_name: selectedHarbour?.name ?? null,
          city: selectedHarbour?.city ?? null,
          image_url: imageUrl,
        })
        .eq("id", editingListingId)
        .eq("owner_id", user.id);
      if (error) throw error;
      setToast("Plats uppdaterad!");
      setTimeout(() => setToast(null), 2500);
      setShowEditListingModal(false);
      setEditingListingId(null);
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Kunde inte uppdatera platsen.");
    } finally {
      setEditingListing(false);
    }
  };

  const openDuplicateListing = (listing: Listing) => {
    setDuplicatingListingId(listing.id);
    setDuplicateListingForm({
      harbour_id: listing.harbour_id != null ? String(listing.harbour_id) : String(params.harbour_id),
      title: `${listing.title} (kopia)`,
      description: listing.description ?? "",
      price_per_season: listing.price_per_season != null ? String(listing.price_per_season) : "",
      max_boat_length: listing.max_boat_length != null ? String(listing.max_boat_length) : "",
      max_boat_width: listing.max_boat_width != null ? String(listing.max_boat_width) : "",
      season_start: listing.season_start ?? "",
      season_end: listing.season_end ?? "",
      createMultiple: false,
      copyCount: "2",
    });
    setShowDuplicateListingModal(true);
  };

  const duplicateListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!duplicatingListingId || duplicatingListing) return;
    const original = listings.find((listing) => listing.id === duplicatingListingId);
    if (!original) return;
    setDuplicatingListing(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user?.id) throw new Error("Inte inloggad.");
      const totalCopies = duplicateListingForm.createMultiple ? Math.max(1, Number(duplicateListingForm.copyCount || "1")) : 1;
      for (let i = 1; i <= totalCopies; i += 1) {
        setDuplicateProgress({ current: i, total: totalCopies });
        const selectedHarbour = ownerHarbours.find((h) => String(h.id) === duplicateListingForm.harbour_id) ?? harbour;
        const copyTitle =
          totalCopies > 1
            ? `${duplicateListingForm.title.replace(/\s*\(kopia\)\s*$/i, "").trim()} ${i}`
            : duplicateListingForm.title.trim();
        const { error } = await supabase.from("listings").insert({
          owner_id: user.id,
          harbour_id: duplicateListingForm.harbour_id,
          title: copyTitle,
          description: duplicateListingForm.description.trim() || null,
          price_per_season: Number(duplicateListingForm.price_per_season),
          max_boat_length: Number(duplicateListingForm.max_boat_length),
          max_boat_width: Number(duplicateListingForm.max_boat_width),
          season_start: duplicateListingForm.season_start,
          season_end: duplicateListingForm.season_end,
          city: selectedHarbour?.city ?? null,
          harbour_name: selectedHarbour?.name ?? null,
          image_url: original.image_url ?? null,
          is_available: true,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      setShowDuplicateListingModal(false);
      setDuplicateProgress(null);
      setToast(totalCopies > 1 ? `${totalCopies} platser skapade!` : "Plats duplicerad!");
      setTimeout(() => setToast(null), 2500);
      await load();
    } catch (error) {
      setDuplicateProgress(null);
      alert(error instanceof Error ? error.message : "Kunde inte duplicera platsen.");
    } finally {
      setDuplicatingListing(false);
    }
  };

  const deleteListing = async (listingId: number | string) => {
    const confirmed = window.confirm("Är du säker? Detta raderar platsen permanent.");
    if (!confirmed) return;
    const { data: activeRows, error: activeError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("listing_id", listingId)
      .in("status", ["pending", "confirmed"]);
    if (activeError) {
      alert(activeError.message);
      return;
    }
    if ((activeRows ?? []).length > 0) {
      alert("Kan inte ta bort plats med aktiva bokningar");
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user?.id) return;
    const { error } = await supabase.from("listings").delete().eq("id", listingId).eq("owner_id", user.id);
    if (error) {
      alert(error.message);
      return;
    }
    setToast("Plats borttagen!");
    setTimeout(() => setToast(null), 2500);
    await load();
  };

  const toggleListingAvailability = async (listing: Listing) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user?.id) return;
    const { error } = await supabase
      .from("listings")
      .update({ is_available: !listing.is_available })
      .eq("id", listing.id)
      .eq("owner_id", user.id);
    if (error) {
      alert(error.message);
      return;
    }
    setToast(!listing.is_available ? "Plats aktiverad!" : "Plats pausad!");
    setTimeout(() => setToast(null), 2500);
    await load();
  };

  const bookedCount = bookings.filter((b) => b.status === "confirmed").length;
  const occupancy = listings.length ? Math.round((bookedCount / listings.length) * 100) : 0;
  const revenue = bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + (b.listings?.price_per_season ?? 0), 0);

  const monthOrder = ["Maj", "Jun", "Jul", "Aug", "Sep"];
  const monthly = monthOrder.map((month, idx) => {
    const targetMonth = 4 + idx; // May-Sep
    const count = bookings.filter((b) => {
      if (!b.created_at) return false;
      return new Date(b.created_at).getMonth() === targetMonth;
    }).length;
    return { month, count };
  });

  if (loading) return <main className="min-h-screen bg-[#0d2252]" />;

  return (
    <main className="min-h-screen bg-[#0d2252] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        {toast ? (
          <div className="mb-4 rounded-xl border border-[#99f6e4] bg-[#0f2b60] p-3 text-sm text-[#5eead4]">{toast}</div>
        ) : null}
        <Link
          href="/dashboard/host/hamnar"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#14b8a6] hover:text-[#5eead4]"
        >
          ← Tillbaka till alla hamnar
        </Link>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-[#14b8a6]">Hamnöversikt</p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">{harbour?.name ?? "Hamn"} · {harbour?.city ?? "Okänd stad"}</h1>
              <button
                onClick={() => setShowEditHarbourModal(true)}
                className="rounded-lg border border-[#14b8a6]/70 px-2 py-1 text-xs font-semibold text-[#5eead4]"
                title="Redigera info"
              >
                ✎
              </button>
            </div>
            <p className="mt-1 text-sm text-white/70">{harbour?.description?.trim() || "Ingen beskrivning tillagd"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#14b8a6]/50 bg-[#14b8a6]/20 px-3 py-1 text-xs font-semibold">{harbour?.is_active ?? true ? "Aktiv" : "Inaktiv"}</span>
            <button
              onClick={() => setShowEditHarbourModal(true)}
              className="rounded-lg border border-[#14b8a6]/70 px-3 py-1.5 text-xs font-semibold text-[#5eead4]"
            >
              Redigera info
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 rounded-xl bg-[#122a5d] p-1">
          {[ ["overview", "Översikt"], ["listings", "Mina Annonser"], ["bookings", "Bokningar"] ].map(([value, label]) => (
            <button key={value} onClick={() => router.push(value === "overview" ? `/dashboard/host/hamnar/${params.harbour_id}` : `/dashboard/host/hamnar/${params.harbour_id}?tab=${value === "listings" ? "annonser" : "bokningar"}`)} className={`rounded-lg px-4 py-2 text-sm ${tab === value ? "bg-[#14b8a6] text-[#0b1b3f]" : "text-white/80"}`}>{label}</button>
          ))}
        </div>

        {tab === "overview" ? (
          <article className="rounded-2xl border border-white/10 bg-[#0d2252] p-6 shadow-[0_18px_45px_rgba(4,14,36,0.38)]">
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl bg-[#123068] p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-white/70">Totalt platser</p>
                <p className="mt-2 text-4xl font-extrabold leading-none">{listings.length}</p>
              </article>
              <article className="rounded-xl bg-[#123068] p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-white/70">Bokade</p>
                <p className="mt-2 text-4xl font-extrabold leading-none">{bookedCount}</p>
              </article>
              <article className="rounded-xl bg-[#123068] p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-white/70">Beläggning</p>
                <p className="mt-2 text-4xl font-extrabold leading-none text-[#14b8a6]">{occupancy}%</p>
              </article>
            </div>

            <div className="mt-7 rounded-xl bg-[#123068] p-5">
              <p className="mb-4 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-white/65">Bokningar per månad</p>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barGap={10}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.68)" tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(20,184,166,0.08)" }}
                      contentStyle={{ backgroundColor: "#0d2252", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }}
                      labelStyle={{ color: "#dff" }}
                    />
                    <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-[#14b8a6]/30 bg-[#0f2b60] px-5 py-4">
              <p className="text-sm text-white/75">Intäkt denna säsong</p>
              <p className="mt-1 text-4xl font-extrabold tracking-[-0.03em] text-[#14b8a6]">{revenue.toLocaleString("sv-SE")} kr</p>
            </div>
          </article>
        ) : null}

        {tab === "listings" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="listings-sort" className="text-sm font-semibold text-white/80">
                  Sortera:
                </label>
                <select
                  id="listings-sort"
                  value={listingsSortBy}
                  onChange={(e) => setListingsSortBy(e.target.value as ListingsSort)}
                  className="rounded-lg border border-white/30 bg-[#0f2b60] px-3 py-2 text-sm font-semibold text-white outline-none transition hover:border-[#14b8a6] focus:border-[#14b8a6]"
                >
                  <option value="created_at_desc">Senast skapade</option>
                  <option value="title_asc">Namn (A-Ö)</option>
                  <option value="title_desc">Namn (Ö-A)</option>
                  <option value="price_asc">Pris (lägst först)</option>
                  <option value="price_desc">Pris (högst först)</option>
                  <option value="number">Nummer i titel</option>
                </select>
              </div>
              <button
                onClick={() => setShowAddListingModal(true)}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f]"
              >
                + Lägg till annons
              </button>
            </div>
            {sortedListings.map((l) => (
              <article key={l.id} className="rounded-xl bg-[#122a5d] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{l.title}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {(l.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong
                    </p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${l.is_available ? "bg-[#dff5ea] text-[#2d9e6b]" : "bg-[#dce3ee] text-[#475569]"}`}>
                      {l.is_available ? "Aktiv" : "Pausad"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void toggleListingAvailability(l)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold">
                      {l.is_available ? "Pausa" : "Aktivera"}
                    </button>
                    <button onClick={() => openEditListing(l)} className="rounded-lg border border-[#14b8a6]/70 px-3 py-1.5 text-xs font-semibold text-[#5eead4]">
                      Redigera
                    </button>
                    <button onClick={() => openDuplicateListing(l)} className="rounded-lg border border-[#14b8a6]/70 px-3 py-1.5 text-xs font-semibold text-[#5eead4]">
                      📋 Duplicera
                    </button>
                    <button onClick={() => void deleteListing(l.id)} className="rounded-lg border border-red-300/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200">
                      Ta bort
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "bookings" ? (
          <div className="space-y-3">{bookings.map((b) => <article key={b.id} className="rounded-xl bg-[#122a5d] p-4"><p className="font-semibold">{b.listings?.title ?? "Okänd annons"}</p><p className="text-xs text-white/70">Status: {b.status}</p></article>)}</div>
        ) : null}
      </section>

      {showAddListingModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createListingForHarbour} className="w-full max-w-2xl rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-xl font-bold">Ny annons i {harbour?.name ?? "vald hamn"}</h3>
            <p className="mt-1 text-xs text-[#4a5568]">Hamn är förvald för denna annons.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select value={newListingForm.harbour_id} onChange={(e) => setNewListingForm((c) => ({ ...c, harbour_id: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" required>
                {ownerHarbours.map((h) => (
                  <option key={h.id} value={String(h.id)}>{h.name ?? "Namnlös hamn"} {h.city ? `• ${h.city}` : ""}</option>
                ))}
              </select>
              <input value={newListingForm.title} onChange={(e) => setNewListingForm((c) => ({ ...c, title: e.target.value }))} placeholder="Titel" className="rounded-lg border px-3 py-2 sm:col-span-2" required />
              <textarea value={newListingForm.description} onChange={(e) => setNewListingForm((c) => ({ ...c, description: e.target.value }))} placeholder="Beskrivning" className="rounded-lg border px-3 py-2 sm:col-span-2" rows={3} />
              <input type="number" min={0} value={newListingForm.price_per_season} onChange={(e) => setNewListingForm((c) => ({ ...c, price_per_season: e.target.value }))} placeholder="Pris per säsong" className="rounded-lg border px-3 py-2" required />
              <input type="number" min={0} value={newListingForm.max_boat_length} onChange={(e) => setNewListingForm((c) => ({ ...c, max_boat_length: e.target.value }))} placeholder="Max båtlängd" className="rounded-lg border px-3 py-2" required />
              <input type="number" min={0} value={newListingForm.max_boat_width} onChange={(e) => setNewListingForm((c) => ({ ...c, max_boat_width: e.target.value }))} placeholder="Max båtbredd" className="rounded-lg border px-3 py-2" required />
              <div className="sm:col-span-2 rounded-lg border p-3">
                <label className="mb-1 block text-sm font-semibold">Bild</label>
                <input type="file" accept="image/*" onChange={(e) => setListingImageFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
              </div>
              <input type="date" value={newListingForm.season_start} onChange={(e) => setNewListingForm((c) => ({ ...c, season_start: e.target.value }))} className="rounded-lg border px-3 py-2" required />
              <input type="date" value={newListingForm.season_end} onChange={(e) => setNewListingForm((c) => ({ ...c, season_end: e.target.value }))} className="rounded-lg border px-3 py-2" required />
              <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={newListingCreateMultiple}
                  onChange={(e) => setNewListingCreateMultiple(e.target.checked)}
                />
                Skapa flera identiska platser
              </label>
              {newListingCreateMultiple ? (
                <div className="sm:col-span-2 rounded-lg border p-3">
                  <label className="mb-1 block text-sm font-semibold">Antal platser att skapa:</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newListingCopyCount}
                    onChange={(e) => setNewListingCopyCount(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-[#4a5568]">
                    Platserna får automatiskt numrering (Plats 1, Plats 2, etc.)
                  </p>
                </div>
              ) : null}
            </div>
            {newListingProgress ? (
              <p className="mt-3 text-sm text-[#0d9488]">
                Skapar plats {newListingProgress.current} av {newListingProgress.total}...
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddListingModal(false);
                  setNewListingCreateMultiple(false);
                  setNewListingCopyCount("2");
                  setNewListingProgress(null);
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Avbryt
              </button>
              <button disabled={savingListing} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">{savingListing ? "Sparar..." : "Spara annons"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {showEditListingModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEditedListing} className="w-full max-w-2xl rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-xl font-bold">Redigera plats</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select value={editListingForm.harbour_id} onChange={(e) => setEditListingForm((c) => ({ ...c, harbour_id: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" required>
                {ownerHarbours.map((h) => (
                  <option key={h.id} value={String(h.id)}>{h.name ?? "Namnlös hamn"} {h.city ? `• ${h.city}` : ""}</option>
                ))}
              </select>
              <input value={editListingForm.title} onChange={(e) => setEditListingForm((c) => ({ ...c, title: e.target.value }))} placeholder="Titel" className="rounded-lg border px-3 py-2 sm:col-span-2" required />
              <textarea value={editListingForm.description} onChange={(e) => setEditListingForm((c) => ({ ...c, description: e.target.value }))} placeholder="Beskrivning" className="rounded-lg border px-3 py-2 sm:col-span-2" rows={3} />
              <input type="number" min={0} value={editListingForm.price_per_season} onChange={(e) => setEditListingForm((c) => ({ ...c, price_per_season: e.target.value }))} placeholder="Pris per säsong" className="rounded-lg border px-3 py-2" required />
              <input type="number" min={0} value={editListingForm.max_boat_length} onChange={(e) => setEditListingForm((c) => ({ ...c, max_boat_length: e.target.value }))} placeholder="Max båtlängd" className="rounded-lg border px-3 py-2" required />
              <input type="number" min={0} value={editListingForm.max_boat_width} onChange={(e) => setEditListingForm((c) => ({ ...c, max_boat_width: e.target.value }))} placeholder="Max båtbredd" className="rounded-lg border px-3 py-2" required />
              <div className="sm:col-span-2 rounded-lg border p-3">
                <label className="mb-1 block text-sm font-semibold">Bild</label>
                {existingEditImageUrl ? (
                  <div className="relative mb-2 h-24 w-24 overflow-hidden rounded">
                    <Image src={existingEditImageUrl} alt="Nuvarande bild" fill className="object-cover" sizes="96px" />
                  </div>
                ) : null}
                <input type="file" accept="image/*" onChange={(e) => setEditListingImageFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
              </div>
              <input type="date" value={editListingForm.season_start} onChange={(e) => setEditListingForm((c) => ({ ...c, season_start: e.target.value }))} className="rounded-lg border px-3 py-2" required />
              <input type="date" value={editListingForm.season_end} onChange={(e) => setEditListingForm((c) => ({ ...c, season_end: e.target.value }))} className="rounded-lg border px-3 py-2" required />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowEditListingModal(false)} className="rounded-lg border px-3 py-2 text-sm">Avbryt</button>
              <button disabled={editingListing} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">{editingListing ? "Sparar..." : "Spara ändringar"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {showDuplicateListingModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={duplicateListing} className="w-full max-w-2xl rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-xl font-bold">Duplicera plats</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select value={duplicateListingForm.harbour_id} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, harbour_id: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" required>
                {ownerHarbours.map((h) => (
                  <option key={h.id} value={String(h.id)}>{h.name ?? "Namnlös hamn"} {h.city ? `• ${h.city}` : ""}</option>
                ))}
              </select>
              <input value={duplicateListingForm.title} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, title: e.target.value }))} placeholder="Titel" className="rounded-lg border px-3 py-2 sm:col-span-2" required />
              <textarea value={duplicateListingForm.description} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, description: e.target.value }))} placeholder="Beskrivning" className="rounded-lg border px-3 py-2 sm:col-span-2" rows={3} />
              <input type="number" min={0} value={duplicateListingForm.price_per_season} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, price_per_season: e.target.value }))} placeholder="Pris per säsong" className="rounded-lg border px-3 py-2" required />
              <input type="number" min={0} value={duplicateListingForm.max_boat_length} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, max_boat_length: e.target.value }))} placeholder="Max båtlängd" className="rounded-lg border px-3 py-2" required />
              <input type="number" min={0} value={duplicateListingForm.max_boat_width} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, max_boat_width: e.target.value }))} placeholder="Max båtbredd" className="rounded-lg border px-3 py-2" required />
              <input type="date" value={duplicateListingForm.season_start} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, season_start: e.target.value }))} className="rounded-lg border px-3 py-2" required />
              <input type="date" value={duplicateListingForm.season_end} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, season_end: e.target.value }))} className="rounded-lg border px-3 py-2" required />
              <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input type="checkbox" checked={duplicateListingForm.createMultiple} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, createMultiple: e.target.checked }))} />
                Skapa flera kopior
              </label>
              {duplicateListingForm.createMultiple ? (
                <input type="number" min={2} value={duplicateListingForm.copyCount} onChange={(e) => setDuplicateListingForm((c) => ({ ...c, copyCount: e.target.value }))} placeholder="Antal kopior" className="rounded-lg border px-3 py-2 sm:col-span-2" />
              ) : null}
            </div>
            {duplicateProgress ? (
              <p className="mt-3 text-sm text-[#0d9488]">Skapar plats {duplicateProgress.current} av {duplicateProgress.total}...</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowDuplicateListingModal(false)} className="rounded-lg border px-3 py-2 text-sm">Avbryt</button>
              <button disabled={duplicatingListing} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">{duplicatingListing ? "Duplicerar..." : "Skapa kopia"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {showEditHarbourModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={updateHarbourInfo} className="w-full max-w-2xl rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-xl font-bold">Redigera hamninfo</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={editHarbourForm.name} onChange={(e) => setEditHarbourForm((c) => ({ ...c, name: e.target.value }))} placeholder="Hamnnamn" className="rounded-lg border px-3 py-2" required />
              <input value={editHarbourForm.city} onChange={(e) => setEditHarbourForm((c) => ({ ...c, city: e.target.value }))} placeholder="Stad" className="rounded-lg border px-3 py-2" required />
              <input value={editHarbourForm.address} onChange={(e) => setEditHarbourForm((c) => ({ ...c, address: e.target.value }))} placeholder="Adress" className="rounded-lg border px-3 py-2 sm:col-span-2" />
              <textarea value={editHarbourForm.description} onChange={(e) => setEditHarbourForm((c) => ({ ...c, description: e.target.value }))} placeholder="Beskrivning / info" className="rounded-lg border px-3 py-2 sm:col-span-2" rows={3} />
            </div>
            <div className="mt-4 rounded-lg border p-3">
              <MapLocationPicker
                lat={editHarbourForm.lat ? Number(editHarbourForm.lat) : null}
                lng={editHarbourForm.lng ? Number(editHarbourForm.lng) : null}
                onPick={(picked) => setEditHarbourForm((c) => ({ ...c, lat: String(picked.lat), lng: String(picked.lng), city: picked.city ?? c.city }))}
                height="220px"
              />
              <p className="mt-2 text-xs text-[#4a5568]">📍 {editHarbourForm.lat || "-"}, {editHarbourForm.lng || "-"} {editHarbourForm.city ? `— ${editHarbourForm.city}` : ""}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowEditHarbourModal(false)} className="rounded-lg border px-3 py-2 text-sm">Avbryt</button>
              <button disabled={savingHarbour} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">{savingHarbour ? "Sparar..." : "Spara ändringar"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
