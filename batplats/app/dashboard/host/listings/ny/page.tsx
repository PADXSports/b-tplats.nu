"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DASHBOARD_TEAL } from "@/components/dashboard-icons";
import {
  HOST_INPUT_CLASS,
  HOST_LABEL_CLASS,
  HOST_LOADING_FALLBACK,
  HOST_PRIMARY_BTN,
  HostDashboardShell,
  HostToast,
  hostCardClass,
} from "@/components/host-dashboard-shell";
import ListingImageUploader, { type ListingGalleryImage } from "@/components/listing-image-uploader";
import RentalTypeChoice from "@/components/RentalTypeChoice";
import { createClient } from "@/lib/supabase/client";
import type { RentalType } from "@/lib/rental-type";

type Harbour = {
  id: string | number;
  name: string | null;
  city: string | null;
};

function CreateListingContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
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
    rental_type: "season" as RentalType,
  });
  const [listingType, setListingType] = useState<"marina" | "private">("marina");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(1);
  const [namePattern, setNamePattern] = useState("Plats {N}");

  const generatedNamesPreview = useMemo(() => {
    if (!bulkMode || !namePattern.includes("{N}")) return [];
    const previewCount = Math.min(Math.max(bulkCount, 1), 3);
    return Array.from({ length: previewCount }, (_, index) => namePattern.replaceAll("{N}", String(index + 1)));
  }, [bulkCount, bulkMode, namePattern]);

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
        router.replace("/login?redirect=/dashboard/host/listings/ny");
        return;
      }
      setOwnerId(user.id);

      const { data, error } = await supabase
        .from("harbours")
        .select("id, name, city")
        .eq("owner_id", user.id)
        .order("name", { ascending: true });
      if (error) {
        setToast({ type: "error", message: "Kunde inte hämta hamnar." });
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Harbour[];
      setHarbours(rows);
      if (rows.length > 0) {
        setForm((prev) => ({ ...prev, harbour_id: String(rows[0].id) }));
      }
      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const submit = async () => {
    if (!ownerId) return;

    const title = form.title.trim();
    const price = Number(form.price_per_season);
    const maxBoatLength = Number(form.max_boat_length);
    const maxBoatWidth = Number(form.max_boat_width);
    const seasonStart = form.season_start;
    const seasonEnd = form.season_end;

    if (
      !form.harbour_id ||
      !title ||
      !form.price_per_season.trim() ||
      !form.max_boat_length.trim() ||
      !form.max_boat_width.trim() ||
      !seasonStart ||
      !seasonEnd
    ) {
      setToast({ type: "error", message: "Fyll i alla obligatoriska fält." });
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      setToast({ type: "error", message: "Ange ett giltigt pris per säsong." });
      return;
    }
    if (Number.isNaN(maxBoatLength) || maxBoatLength < 1 || maxBoatLength > 50) {
      setToast({ type: "error", message: "Max båtlängd måste vara mellan 1 och 50 meter." });
      return;
    }
    if (Number.isNaN(maxBoatWidth) || maxBoatWidth < 1 || maxBoatWidth > 15) {
      setToast({ type: "error", message: "Max båtbredd måste vara mellan 1 och 15 meter." });
      return;
    }
    if (new Date(seasonStart).getTime() >= new Date(seasonEnd).getTime()) {
      setToast({ type: "error", message: "Säsongstart måste vara före säsongsslut." });
      return;
    }
    if (bulkMode) {
      if (bulkCount < 1 || bulkCount > 50) {
        setToast({ type: "error", message: "Antal platser måste vara mellan 1 och 50." });
        return;
      }
      if (!namePattern.includes("{N}")) {
        setToast({ type: "error", message: "Namnmönstret måste innehålla {N}." });
        return;
      }
    }

    setSaving(true);
    const imageUrl = galleryImages[0]?.image_url ?? null;

    const selectedHarbour = harbours.find((h) => String(h.id) === form.harbour_id);
    const basePayload = {
      owner_id: ownerId,
      harbour_id: form.harbour_id,
      harbour_name: selectedHarbour?.name ?? null,
      city: selectedHarbour?.city ?? null,
      description: form.description.trim() || null,
      price_per_season: price,
      max_boat_length: maxBoatLength,
      max_boat_width: maxBoatWidth,
      season_start: seasonStart,
      season_end: seasonEnd,
      rental_type: form.rental_type,
      image_url: imageUrl,
      is_available: true,
      listing_type: listingType,
    };

    const payload = bulkMode
      ? Array.from({ length: bulkCount }, (_, index) => ({
          ...basePayload,
          title: namePattern.replaceAll("{N}", String(index + 1)),
        }))
      : [{ ...basePayload, title }];

    const { data: createdListings, error } = await supabase.from("listings").insert(payload).select("id");
    if (error) {
      setToast({ type: "error", message: bulkMode ? "Kunde inte skapa flera platser." : "Kunde inte skapa plats." });
      setSaving(false);
      return;
    }

    if (createdListings && galleryImages.length > 0) {
      const imageRows = (createdListings as Array<{ id: string | number }>).flatMap((listing) =>
        galleryImages.map((image, index) => ({
          listing_id: listing.id,
          image_url: image.image_url,
          display_order: index,
        })),
      );
      await supabase.from("listing_images").insert(imageRows);
    }

    setToast({ type: "success", message: bulkMode ? `Skapade ${bulkCount} nya platser!` : "Plats skapad!" });
    window.setTimeout(() => {
      router.push(`/dashboard/host/hamnar/${form.harbour_id}`);
    }, 900);
  };

  return (
    <HostDashboardShell
      activeNav="listings"
      pageTitle="Skapa ny plats"
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/dashboard/host/hamnar")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Tillbaka
        </button>
      }
    >
      <HostToast toast={toast} />

      {loading ? (
        <div className={`${hostCardClass} max-w-3xl p-5 text-sm text-gray-500`}>Laddar...</div>
      ) : (
        <div className={`${hostCardClass} max-w-3xl p-5 sm:p-6`}>
            <div className="space-y-6">
              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Grundläggande information</h2>
                <div className="mb-6 mt-4">
                  <label className={HOST_LABEL_CLASS}>Typ av plats</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setListingType("marina")}
                      className={`rounded-xl border-2 p-3 text-sm font-medium transition ${
                        listingType === "marina"
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      🏗️ Hamn/Marina
                    </button>
                    <button
                      type="button"
                      onClick={() => setListingType("private")}
                      className={`rounded-xl border-2 p-3 text-sm font-medium transition ${
                        listingType === "private"
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      🚤 Privat uthyrning
                    </button>
                  </div>
                </div>
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
                      placeholder="Brygga A · Plats 12"
                      className={HOST_INPUT_CLASS}
                    />
                    <p className="mt-1 text-xs text-gray-500">T.ex. &quot;Brygga A · Plats 12&quot; eller &quot;Södra Kajen 8&quot;</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={HOST_LABEL_CLASS}>Beskrivning (valfritt)</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Beskriv platsen"
                      className={`${HOST_INPUT_CLASS} min-h-28`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Beskriv läget, närhet till faciliteter, eluttag, etc.
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Båtspecifikationer</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={HOST_LABEL_CLASS}>Max båtlängd (m)</label>
                    <input
                      value={form.max_boat_length}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_boat_length: e.target.value }))}
                      type="number"
                      min={1}
                      max={50}
                      className={HOST_INPUT_CLASS}
                    />
                    <p className="mt-1 text-xs text-gray-500">Maximal längd på båt som får ligga här</p>
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Max båtbredd (m)</label>
                    <input
                      value={form.max_boat_width}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_boat_width: e.target.value }))}
                      type="number"
                      min={1}
                      max={15}
                      className={HOST_INPUT_CLASS}
                    />
                    <p className="mt-1 text-xs text-gray-500">Maximal bredd på båt</p>
                  </div>
                  <div className="sm:col-span-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-gray-600">
                    <span className="mr-2 text-lg">⛵</span>
                    Längd = fören till aktern, bredd = båtens bredaste punkt.
                  </div>
                </div>
              </section>

              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Säsong och pris</h2>
                <div className="mt-4">
                  <label className={HOST_LABEL_CLASS}>Uthyrningstyp</label>
                  <RentalTypeChoice
                    className="mt-2"
                    value={form.rental_type}
                    onChange={(rental_type) => setForm((prev) => ({ ...prev, rental_type }))}
                  />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={HOST_LABEL_CLASS}>Säsongstart</label>
                    <input
                      value={form.season_start}
                      onChange={(e) => setForm((prev) => ({ ...prev, season_start: e.target.value }))}
                      type="date"
                      className={HOST_INPUT_CLASS}
                    />
                    <p className="mt-1 text-xs text-gray-500">Första tillgängliga datum</p>
                  </div>
                  <div>
                    <label className={HOST_LABEL_CLASS}>Säsongsslut</label>
                    <input
                      value={form.season_end}
                      onChange={(e) => setForm((prev) => ({ ...prev, season_end: e.target.value }))}
                      type="date"
                      className={HOST_INPUT_CLASS}
                    />
                    <p className="mt-1 text-xs text-gray-500">Sista tillgängliga datum</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={HOST_LABEL_CLASS}>Pris per säsong (SEK)</label>
                    <input
                      value={form.price_per_season}
                      onChange={(e) => setForm((prev) => ({ ...prev, price_per_season: e.target.value }))}
                      type="number"
                      min={1}
                      placeholder="ex. 18500"
                      className={`${HOST_INPUT_CLASS} text-lg font-semibold`}
                    />
                    <p className="mt-1 text-xs text-gray-500">Totalpris för hela säsongen</p>
                  </div>
                </div>
              </section>

              <section className="border-b border-gray-100 pb-6">
                <h2 className="text-lg font-bold text-gray-900">Bild (valfritt)</h2>
                <div className="mt-4">
                  <ListingImageUploader existingImages={galleryImages} onChange={setGalleryImages} />
                </div>
              </section>

              <section className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <h2 className="text-lg font-bold text-gray-900">Skapa flera identiska platser</h2>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={bulkMode}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBulkMode(checked);
                      if (checked && !namePattern.includes("{N}")) {
                        setNamePattern(`${form.title.trim() || "Plats"} {N}`);
                      }
                    }}
                    className="h-4 w-4"
                  />
                  Jag vill skapa flera identiska platser
                </label>

                {bulkMode ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={HOST_LABEL_CLASS}>Antal platser att skapa</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={bulkCount}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setBulkCount(Number.isNaN(value) ? 1 : Math.min(Math.max(value, 1), 50));
                        }}
                        className={HOST_INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={HOST_LABEL_CLASS}>Namnmönster</label>
                      <input
                        value={namePattern}
                        onChange={(e) => setNamePattern(e.target.value)}
                        placeholder="Brygga A · Plats {N}"
                        className={HOST_INPUT_CLASS}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Ex: "Brygga A · Plats {"{N}"}", "Kajen {"{N}"}"
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">
                        Använd {"{N}"} där numret ska vara. Varje plats får samma specs och pris.
                      </p>
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                        Förhandsvisning
                      </p>
                      {generatedNamesPreview.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-gray-700">
                          {generatedNamesPreview.map((name) => (
                            <li key={name}>• {name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">Lägg till {"{N}"} i namnmönstret för förhandsvisning.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving || harbours.length === 0}
                className={HOST_PRIMARY_BTN}
                style={{ background: DASHBOARD_TEAL }}
              >
                {saving ? "Skapar..." : bulkMode ? `Skapa ${bulkCount} platser` : "Skapa plats"}
              </button>
            </div>
          </div>
        )}
    </HostDashboardShell>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense fallback={HOST_LOADING_FALLBACK}>
      <CreateListingContent />
    </Suspense>
  );
}
