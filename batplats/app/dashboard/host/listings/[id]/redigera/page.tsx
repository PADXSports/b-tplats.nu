"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DASHBOARD_TEAL } from "@/components/dashboard-icons";
import {
  HOST_INPUT_CLASS,
  HOST_LABEL_CLASS,
  HOST_LOADING_FALLBACK,
  HOST_PRIMARY_BTN,
  HOST_SECONDARY_BTN,
  HostDashboardShell,
  HostToast,
  hostCardClass,
} from "@/components/host-dashboard-shell";
import ListingImageUploader, { type ListingGalleryImage } from "@/components/listing-image-uploader";
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

function EditListingContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const listingId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [listing, setListing] = useState<ListingRow | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [galleryImages, setGalleryImages] = useState<ListingGalleryImage[]>([]);

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
        is_available: current.is_available ?? true,
      });
      const { data: imageRows } = await supabase
        .from("listing_images")
        .select("id, image_url, display_order")
        .eq("listing_id", listingId)
        .order("display_order", { ascending: true });
      setGalleryImages((imageRows ?? []) as ListingGalleryImage[]);
      setLoading(false);
    };

    void init();
  }, [listingId, router, supabase]);

  const submit = async () => {
    if (!listing) return;
    if (!form.harbour_id || !form.title.trim()) {
      setToast({ type: "error", message: "Välj hamn och fyll i titel." });
      return;
    }

    setSaving(true);
    const imageUrl = galleryImages[0]?.image_url ?? null;

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
    <HostDashboardShell
      activeNav="listings"
      pageTitle="Redigera plats"
      headerAction={
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← Tillbaka
        </button>
      }
    >
      <HostToast toast={toast} />

      {loading ? (
        <div className={`${hostCardClass} max-w-3xl p-5 text-sm text-gray-500`}>Laddar annons...</div>
      ) : (
        <div className={`${hostCardClass} max-w-3xl p-5 sm:p-6`}>
            <div className="space-y-6">
              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Bild</h2>
                <div className="mt-3">
                  <ListingImageUploader listingId={listingId} existingImages={galleryImages} onChange={setGalleryImages} />
                </div>
              </section>

              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Grundläggande information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={HOST_LABEL_CLASS}>Hamn</label>
                    <select
                      value={form.harbour_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, harbour_id: e.target.value }))}
                      className={HOST_INPUT_CLASS}
                    >
                      {harbours.map((h) => (
                        <option key={h.id} value={String(h.id)}>
                          {h.name ?? "Namnlös hamn"} {h.city ? `(${h.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Titel</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="T.ex. Brygga A · Plats 12"
                      className={HOST_INPUT_CLASS}
                    />
                    <p className="mt-1 text-xs text-gray-500">Namn som hjälper båtägare förstå exakt vilken plats det gäller.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={HOST_LABEL_CLASS}>Beskrivning</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Beskriv läge, närhet till service, eluttag och övrig info"
                      className={`${HOST_INPUT_CLASS} min-h-28`}
                    />
                  </div>
                </div>
              </section>

              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Specifikationer och säsong</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={HOST_LABEL_CLASS}>Pris / säsong (SEK)</label>
                    <input
                      value={form.price_per_season}
                      onChange={(e) => setForm((prev) => ({ ...prev, price_per_season: e.target.value }))}
                      type="number"
                      placeholder="ex. 18000"
                      className={HOST_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Max båtlängd (m)</label>
                    <input
                      value={form.max_boat_length}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_boat_length: e.target.value }))}
                      type="number"
                      placeholder="ex. 10"
                      className={HOST_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Max båtbredd (m)</label>
                    <input
                      value={form.max_boat_width}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_boat_width: e.target.value }))}
                      type="number"
                      placeholder="ex. 3.2"
                      className={HOST_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Säsongstart</label>
                    <input
                      value={form.season_start}
                      onChange={(e) => setForm((prev) => ({ ...prev, season_start: e.target.value }))}
                      type="date"
                      className={HOST_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Säsongsslut</label>
                    <input
                      value={form.season_end}
                      onChange={(e) => setForm((prev) => ({ ...prev, season_end: e.target.value }))}
                      type="date"
                      className={HOST_INPUT_CLASS}
                    />
                  </div>
                </div>
              </section>

              <section>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_available: e.target.checked }))}
                  />
                  Tillgänglig för bokning
                </label>
                <p className="mt-1 text-xs text-gray-500">Avmarkera om platsen tillfälligt inte ska kunna bokas.</p>
              </section>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className={HOST_SECONDARY_BTN}
                disabled={saving}
              >
                Tillbaka
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className={HOST_PRIMARY_BTN}
                style={{ background: DASHBOARD_TEAL }}
              >
                {saving ? "Sparar..." : "Spara ändringar"}
              </button>
            </div>
          </div>
        )}
    </HostDashboardShell>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={HOST_LOADING_FALLBACK}>
      <EditListingContent />
    </Suspense>
  );
}
