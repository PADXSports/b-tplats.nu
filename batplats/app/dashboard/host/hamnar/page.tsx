"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import MapLocationPicker from "@/components/map-location-picker";
import { createClient } from "@/lib/supabase/client";

type Harbour = {
  id: number | string;
  name: string | null;
  city: string | null;
  address: string | null;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  owner_id: string | null;
  is_active?: boolean | null;
};

type OwnerListing = {
  id: number | string;
  title: string;
  harbour_id: number | string | null;
};

export default function HostHarboursPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingHarbourId, setDeletingHarbourId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", address: "", description: "", lat: "", lng: "" });
  const [newMapRegion, setNewMapRegion] = useState("");
  const [editHarbourId, setEditHarbourId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", city: "", address: "", description: "", lat: "", lng: "" });
  const [unlinkedListings, setUnlinkedListings] = useState<OwnerListing[]>([]);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});

  const reverseGeocodeHarbour = useCallback(async (lat: number, lng: number) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return null;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${lat},${lng}`)}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const payload = (await response.json()) as {
        status?: string;
        results?: Array<{
          formatted_address?: string;
          types?: string[];
          address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
        }>;
      };
      if (payload.status !== "OK" || !payload.results?.length) return null;

      const results = payload.results;
      const poiResult = results.find((result) => result.types?.includes("point_of_interest"));
      const localitySource = results.find((result) =>
        result.address_components?.some((component) =>
          component.types.includes("locality") || component.types.includes("postal_town"),
        ),
      ) ?? results[0];
      const streetSource = results.find((result) =>
        result.address_components?.some((component) => component.types.includes("route")),
      ) ?? results[0];

      const extractComponent = (source: typeof results[number] | undefined, keys: string[]) =>
        source?.address_components?.find((component) => keys.some((key) => component.types.includes(key)))?.long_name ?? "";

      const region =
        extractComponent(localitySource, ["administrative_area_level_1"]) ||
        extractComponent(localitySource, ["administrative_area_level_2"]);
      const city =
        extractComponent(localitySource, ["locality"]) ||
        extractComponent(localitySource, ["postal_town"]) ||
        extractComponent(localitySource, ["administrative_area_level_2"]);
      const streetNumber = extractComponent(streetSource, ["street_number"]);
      const route = extractComponent(streetSource, ["route"]);
      const postalCode = extractComponent(localitySource, ["postal_code"]);
      const addressLine = [streetNumber, route].filter(Boolean).join(" ").trim();
      const postalCity = [postalCode, city].filter(Boolean).join(" ").trim();
      const address = addressLine && postalCity ? `${addressLine}, ${postalCity}` : addressLine || postalCity || (localitySource?.formatted_address ?? "");
      const harbourName =
        poiResult?.address_components?.[0]?.long_name ||
        "";

      return {
        harbourName,
        city,
        address,
        region,
      };
    } catch (error) {
      console.error("Reverse geocode failed:", error);
      return null;
    }
  }, []);

  const handleNewMapPick = useCallback(async (picked: { lat: number; lng: number; city?: string }) => {
    setForm((current) => ({
      ...current,
      lat: String(picked.lat),
      lng: String(picked.lng),
      city: picked.city ?? current.city,
    }));
    const geocoded = await reverseGeocodeHarbour(picked.lat, picked.lng);
    if (!geocoded) {
      setNewMapRegion(picked.city ?? "");
      return;
    }
    setNewMapRegion(geocoded.region || geocoded.city || picked.city || "");
    setForm((current) => ({
      ...current,
      name: current.name || geocoded.harbourName || "",
      city: geocoded.city || current.city || picked.city || "",
      address: geocoded.address || current.address,
    }));
  }, [reverseGeocodeHarbour]);

  const load = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      router.replace("/login?redirect=/dashboard/host/hamnar");
      return;
    }

    const { data } = await supabase
      .from("harbours")
      .select("id, name, city, address, description, lat, lng, owner_id, is_active")
      .eq("owner_id", user.id)
      .order("name", { ascending: true });

    const ids = ((data ?? []) as Harbour[]).map((h) => h.id);
    const listingsByHarbour = new Map<string, number>();
    if (ids.length > 0) {
      const { data: listingRows } = await supabase.from("listings").select("id, harbour_id").in("harbour_id", ids);
      for (const row of listingRows ?? []) {
        const key = String(row.harbour_id ?? "");
        listingsByHarbour.set(key, (listingsByHarbour.get(key) ?? 0) + 1);
      }
    }

    const ownedHarbours = (data ?? []) as Harbour[];
    setHarbours(ownedHarbours.map((h) => ({ ...h, listingCount: listingsByHarbour.get(String(h.id)) ?? 0 })) as Harbour[]);

    const ownedHarbourIds = new Set(ownedHarbours.map((h) => String(h.id)));
    const { data: ownerListingsData } = await supabase
      .from("listings")
      .select("id, title, harbour_id")
      .eq("owner_id", user.id)
      .order("id", { ascending: false });
    const ownerListings = (ownerListingsData ?? []) as OwnerListing[];
    const orphaned = ownerListings.filter(
      (listing) => listing.harbour_id == null || !ownedHarbourIds.has(String(listing.harbour_id)),
    );
    setUnlinkedListings(orphaned);
    setLinkSelections((current) => {
      const next = { ...current };
      for (const listing of orphaned) {
        if (!next[String(listing.id)] && ownedHarbours.length > 0) {
          next[String(listing.id)] = String(ownedHarbours[0].id);
        }
      }
      return next;
    });
    setLoading(false);
  }, [router, supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const toggleHarbourActive = async (harbour: Harbour) => {
    const { error } = await supabase.from("harbours").update({ is_active: !(harbour.is_active ?? true) }).eq("id", harbour.id);
    if (!error) await load();
  };

  const createHarbour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user?.id) {
      alert("Du måste vara inloggad för att skapa en hamn.");
      setSaving(false);
      return;
    }

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const formData = {
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim() || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      owner_id: user.id,
    };

    console.log("Inserting harbour with owner_id:", user.id);
    console.log("Form data:", formData);

    if (!formData.name || !formData.city || formData.lat == null || formData.lng == null) {
      alert("Fyll i namn, stad och välj plats på kartan (lat/lng).");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("harbours")
      .insert({
        name: formData.name,
        city: formData.city,
        address: formData.address,
        description: form.description.trim() || null,
        lat: formData.lat,
        lng: formData.lng,
        owner_id: user.id,
        is_active: true,
      })
      .select();

    if (error) {
      console.error("Harbour insert error:", error);
      alert(`Fel vid sparande: ${error.message}`);
      setSaving(false);
      return;
    }

    console.log("Inserted harbour:", data);
    if (data) {
      setShowNew(false);
      setForm({ name: "", city: "", address: "", description: "", lat: "", lng: "" });
      setNewMapRegion("");
      await load();
    }
    setSaving(false);
  };

  const openEditModal = (harbour: Harbour & { lat?: number | null; lng?: number | null }) => {
    setEditHarbourId(String(harbour.id));
    setEditForm({
      name: harbour.name ?? "",
      city: harbour.city ?? "",
      address: harbour.address ?? "",
      description: harbour.description ?? "",
      lat: harbour.lat != null ? String(harbour.lat) : "",
      lng: harbour.lng != null ? String(harbour.lng) : "",
    });
    setShowEdit(true);
  };

  const saveHarbourEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editHarbourId || saving) return;
    setSaving(true);
    const lat = Number(editForm.lat);
    const lng = Number(editForm.lng);
    const { error } = await supabase
      .from("harbours")
      .update({
        name: editForm.name.trim(),
        city: editForm.city.trim(),
        address: editForm.address.trim() || null,
        description: editForm.description.trim() || null,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
      })
      .eq("id", editHarbourId);
    if (error) {
      alert(`Kunde inte uppdatera hamn: ${error.message}`);
      setSaving(false);
      return;
    }
    alert("Hamn uppdaterad!");
    setShowEdit(false);
    setEditHarbourId(null);
    setSaving(false);
    await load();
  };

  const deleteHarbour = async (harbourId: string) => {
    if (deletingHarbourId) return;
    const confirmed = window.confirm("Är du säker? Detta tar bort hamnen och alla dess platser.");
    if (!confirmed) return;
    setDeletingHarbourId(harbourId);
    const { count, error: listingsError } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("harbour_id", harbourId);
    if (listingsError) {
      alert(`Kunde inte kontrollera platser: ${listingsError.message}`);
      setDeletingHarbourId(null);
      return;
    }
    if ((count ?? 0) > 0) {
      alert("Kan inte ta bort hamn med aktiva platser. Ta bort platserna först.");
      setDeletingHarbourId(null);
      return;
    }
    const { error } = await supabase.from("harbours").delete().eq("id", harbourId);
    if (error) {
      alert(`Kunde inte ta bort hamn: ${error.message}`);
      setDeletingHarbourId(null);
      return;
    }
    setDeletingHarbourId(null);
    await load();
  };

  const linkAllListings = async () => {
    if (linking || unlinkedListings.length === 0) return;
    setLinking(true);
    await Promise.all(
      unlinkedListings.map(async (listing) => {
        const nextHarbourId = linkSelections[String(listing.id)];
        if (!nextHarbourId) return;
        await supabase.from("listings").update({ harbour_id: nextHarbourId }).eq("id", listing.id);
      }),
    );
    setLinking(false);
    await load();
  };

  return (
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#14b8a6]">Hamnar</p>
            <h1 className="text-2xl font-extrabold">Hantera dina hamnar</h1>
          </div>
          <button
            onClick={() => {
              setNewMapRegion("");
              setShowNew(true);
            }}
            className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f]"
          >
            + Lägg till ny hamn
          </button>
        </div>

        {loading ? <p className="text-sm text-white/70">Laddar...</p> : (
          <>
            {unlinkedListings.length > 0 ? (
              <article className="mb-6 rounded-xl border border-amber-300/30 bg-amber-100/10 p-4">
                <h2 className="text-base font-bold text-amber-100">Befintliga platser hittades som inte är länkade till någon hamn. Vill du länka dem nu?</h2>
                <div className="mt-4 space-y-3">
                  {unlinkedListings.map((listing) => (
                    <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#122a5d] p-3">
                      <p className="text-sm font-semibold">{listing.title}</p>
                      <select
                        value={linkSelections[String(listing.id)] ?? ""}
                        onChange={(event) =>
                          setLinkSelections((current) => ({ ...current, [String(listing.id)]: event.target.value }))
                        }
                        className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                      >
                        <option value="">Välj hamn</option>
                        {harbours.map((harbour) => (
                          <option key={harbour.id} value={String(harbour.id)}>
                            {harbour.name ?? "Namnlös hamn"} {harbour.city ? `• ${harbour.city}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => void linkAllListings()}
                  disabled={linking}
                  className="mt-4 rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f] disabled:opacity-70"
                >
                  {linking ? "Länkar..." : "Länka alla"}
                </button>
              </article>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {harbours.map((harbour: Harbour & { listingCount?: number }) => (
                <article key={harbour.id} className="rounded-xl bg-[#122a5d] p-5">
                  <p className="text-xs uppercase text-[#14b8a6]">{harbour.city ?? "Okänd stad"}</p>
                  <h2 className="text-xl font-bold">{harbour.name ?? "Namnlös hamn"}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-white/60">{harbour.description ?? "Ingen beskrivning tillagd"}</p>
                  <p className="mt-2 text-sm text-white/70">{harbour.listingCount ?? 0} annonser</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={() => void toggleHarbourActive(harbour)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs">
                      {harbour.is_active ?? true ? "Aktiv" : "Inaktiv"}
                    </button>
                    <button onClick={() => router.push(`/dashboard/host/hamnar/${harbour.id}`)} className="rounded-lg bg-[#14b8a6] px-3 py-1.5 text-xs font-semibold text-[#0b1b3f]">Hantera</button>
                    <button onClick={() => openEditModal(harbour)} className="rounded-lg border border-[#14b8a6]/70 px-3 py-1.5 text-xs font-semibold text-[#5eead4]">Redigera</button>
                    <button
                      onClick={() => void deleteHarbour(String(harbour.id))}
                      disabled={deletingHarbourId === String(harbour.id)}
                      className="rounded-lg border border-red-300/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-70"
                    >
                      {deletingHarbourId === String(harbour.id) ? "Tar bort..." : "Ta bort"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {showNew ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createHarbour} className="w-full max-w-2xl rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-xl font-bold">Ny hamn</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Hamnnamn" className="rounded-lg border px-3 py-2" required />
              <input value={form.city} onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))} placeholder="Stad" className="rounded-lg border px-3 py-2" required />
              <input value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} placeholder="Adress" className="rounded-lg border px-3 py-2 sm:col-span-2" />
              <textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Beskrivning / info" className="rounded-lg border px-3 py-2 sm:col-span-2" rows={3} />
            </div>
            <div className="mt-4 rounded-lg border p-3">
              <MapLocationPicker
                lat={form.lat ? Number(form.lat) : null}
                lng={form.lng ? Number(form.lng) : null}
                onPick={(picked) => { void handleNewMapPick(picked); }}
                height="220px"
              />
              <p className="mt-2 text-xs text-[#4a5568]">📍 {form.lat || "-"}, {form.lng || "-"} {newMapRegion ? `— ${newMapRegion}` : form.city ? `— ${form.city}` : ""}</p>
              <p className="mt-1 text-xs text-[#6b7280]">Fält auto-fylls från kartposition och kan redigeras manuellt.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="rounded-lg border px-3 py-2 text-sm">Avbryt</button>
              <button disabled={saving} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">{saving ? "Sparar..." : "Spara hamn"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {showEdit ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveHarbourEdit} className="w-full max-w-2xl rounded-xl bg-white p-5 text-[#0f1f3d]">
            <h3 className="text-xl font-bold">Redigera hamn</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} placeholder="Hamnnamn" className="rounded-lg border px-3 py-2" required />
              <input value={editForm.city} onChange={(e) => setEditForm((c) => ({ ...c, city: e.target.value }))} placeholder="Stad" className="rounded-lg border px-3 py-2" required />
              <input value={editForm.address} onChange={(e) => setEditForm((c) => ({ ...c, address: e.target.value }))} placeholder="Adress" className="rounded-lg border px-3 py-2 sm:col-span-2" />
              <textarea value={editForm.description} onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))} placeholder="Beskrivning / info" className="rounded-lg border px-3 py-2 sm:col-span-2" rows={3} />
            </div>
            <div className="mt-4 rounded-lg border p-3">
              <MapLocationPicker
                lat={editForm.lat ? Number(editForm.lat) : null}
                lng={editForm.lng ? Number(editForm.lng) : null}
                onPick={(picked) => setEditForm((c) => ({ ...c, lat: String(picked.lat), lng: String(picked.lng), city: picked.city ?? c.city }))}
                height="220px"
              />
              <p className="mt-2 text-xs text-[#4a5568]">📍 {editForm.lat || "-"}, {editForm.lng || "-"} {editForm.city ? `— ${editForm.city}` : ""}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border px-3 py-2 text-sm">Avbryt</button>
              <button disabled={saving} className="rounded-lg bg-[#14b8a6] px-3 py-2 text-sm font-semibold text-[#0b1b3f]">{saving ? "Sparar..." : "Spara ändringar"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
