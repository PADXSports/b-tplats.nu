"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createClient } from "@/lib/supabase/client";

type Harbour = {
  id: string | number;
  name: string | null;
  city: string | null;
};

type ListingRow = {
  id: string | number;
  owner_id: string | null;
  harbour_id: string | number | null;
  title: string | null;
  description: string | null;
  price_per_season: number | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  season_start: string | null;
  season_end: string | null;
  image_url: string | null;
  is_available: boolean | null;
};

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const listingId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    harbour_id: "",
    title: "",
    description: "",
    price_per_season: "",
    max_boat_length: "",
    max_boat_width: "",
    season_start: "",
    season_end: "",
    image_url: "",
    image_file: null as File | null,
    is_available: true,
  });

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=/dashboard/host/listings/${listingId}/redigera`);
        return;
      }

      const { data: harbourRows } = await supabase.from("harbours").select("id, name, city").eq("owner_id", user.id);
      setHarbours((harbourRows ?? []) as Harbour[]);

      const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();
      if (error || !data) {
        setToast({ type: "error", message: "Annonsen kunde inte hittas." });
        setLoading(false);
        return;
      }

      const current = data as ListingRow;
      if (current.owner_id && current.owner_id !== user.id) {
        setToast({ type: "error", message: "Du har inte tillgång till annonsen." });
        router.replace("/dashboard/host");
        return;
      }

      setListing(current);
      setForm({
        harbour_id: current.harbour_id != null ? String(current.harbour_id) : "",
        title: current.title ?? "",
        description: current.description ?? "",
        price_per_season: current.price_per_season != null ? String(current.price_per_season) : "",
        max_boat_length: current.max_boat_length != null ? String(current.max_boat_length) : "",
        max_boat_width: current.max_boat_width != null ? String(current.max_boat_width) : "",
        season_start: current.season_start ?? "",
        season_end: current.season_end ?? "",
        image_url: current.image_url ?? "",
        image_file: null,
        is_available: current.is_available ?? true,
      });
      setLoading(false);
    };

    void init();
  }, [listingId, router, supabase]);

  const uploadImage = async (file: File) => {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!listing) return;
    if (!form.harbour_id || !form.title.trim()) {
      setToast({ type: "error", message: "Välj hamn och fyll i titel." });
      return;
    }

    setSaving(true);
    let imageUrl = form.image_url.trim() || null;
    if (form.image_file) {
      try {
        imageUrl = await uploadImage(form.image_file);
      } catch {
        setToast({ type: "error", message: "Bilduppladdning misslyckades." });
        setSaving(false);
        return;
      }
    }

    const selectedHarbour = harbours.find((h) => String(h.id) === form.harbour_id);
    const payload = {
      harbour_id: form.harbour_id,
      harbour_name: selectedHarbour?.name ?? null,
      city: selectedHarbour?.city ?? null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_per_season: form.price_per_season.trim() ? Number(form.price_per_season) : null,
      max_boat_length: form.max_boat_length.trim() ? Number(form.max_boat_length) : null,
      max_boat_width: form.max_boat_width.trim() ? Number(form.max_boat_width) : null,
      season_start: form.season_start || null,
      season_end: form.season_end || null,
      image_url: imageUrl,
      is_available: form.is_available,
    };

    const { error } = await supabase.from("listings").update(payload).eq("id", listing.id);
    if (error) {
      setToast({ type: "error", message: "Kunde inte spara ändringar." });
      setSaving(false);
      return;
    }

    router.push(`/dashboard/host/hamnar/${form.harbour_id}`);
  };

  return (
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-white/70 hover:text-white"
            >
              ← Tillbaka
            </button>
            <h1 className="mt-1 text-2xl font-extrabold">Redigera plats</h1>
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

        {loading ? (
          <div className="rounded-xl bg-[#122a5d] p-5 text-sm text-white/70">Laddar annons...</div>
        ) : (
          <div className="rounded-xl bg-[#122a5d] p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={form.harbour_id}
                onChange={(e) => setForm((prev) => ({ ...prev, harbour_id: e.target.value }))}
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              >
                {harbours.map((h) => (
                  <option key={h.id} value={String(h.id)}>
                    {h.name ?? "Namnlös hamn"} {h.city ? `(${h.city})` : ""}
                  </option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titel"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.price_per_season}
                onChange={(e) => setForm((prev) => ({ ...prev, price_per_season: e.target.value }))}
                type="number"
                placeholder="Pris / säsong (SEK)"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.max_boat_length}
                onChange={(e) => setForm((prev) => ({ ...prev, max_boat_length: e.target.value }))}
                type="number"
                placeholder="Max båtlängd (m)"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.max_boat_width}
                onChange={(e) => setForm((prev) => ({ ...prev, max_boat_width: e.target.value }))}
                type="number"
                placeholder="Max båtbredd (m)"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.season_start}
                onChange={(e) => setForm((prev) => ({ ...prev, season_start: e.target.value }))}
                type="date"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.season_end}
                onChange={(e) => setForm((prev) => ({ ...prev, season_end: e.target.value }))}
                type="date"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.image_url}
                onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="Bild-URL (valfritt)"
                className="sm:col-span-2 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm((prev) => ({ ...prev, image_file: e.target.files?.[0] ?? null }))}
                className="sm:col-span-2 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className="sm:col-span-2 min-h-28 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_available: e.target.checked }))}
                />
                Tillgänglig för bokning
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => router.back()}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm"
                disabled={saving}
              >
                Tillbaka
              </button>
              <button
                onClick={() => void submit()}
                disabled={saving}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f] disabled:opacity-50"
              >
                {saving ? "Sparar..." : "Spara ändringar"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
