"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import ListingImageUploader, { type ListingGalleryImage } from "@/components/listing-image-uploader";
import { createClient } from "@/lib/supabase/client";

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
  });
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
      image_url: imageUrl,
      is_available: true,
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
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <button onClick={() => router.push("/dashboard/host/hamnar")} className="text-sm text-white/70 hover:text-white">
            ← Tillbaka
          </button>
          <h1 className="mt-1 text-2xl font-extrabold">Skapa ny plats</h1>
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
          <div className="rounded-xl bg-[#122a5d] p-5 text-sm text-white/70">Laddar...</div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#122a5d] p-5 sm:p-6">
            <div className="space-y-6">
              <section className="border-b border-white/10 pb-6">
                <h2 className="text-lg font-bold">Grundläggande information</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Hamn</label>
                    <select
                      value={form.harbour_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, harbour_id: e.target.value }))}
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    >
                      {harbours.map((h) => (
                        <option key={h.id} value={String(h.id)}>
                          {h.name ?? "Namnlös hamn"} {h.city ? `(${h.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Titel</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Brygga A · Plats 12"
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-white/60">T.ex. "Brygga A · Plats 12" eller "Södra Kajen 8"</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold">Beskrivning (valfritt)</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Beskriv platsen"
                      className="min-h-28 w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-white/60">
                      Beskriv läget, närhet till faciliteter, eluttag, etc.
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-white/10 pb-6">
                <h2 className="text-lg font-bold">Båtspecifikationer</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Max båtlängd (m)</label>
                    <input
                      value={form.max_boat_length}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_boat_length: e.target.value }))}
                      type="number"
                      min={1}
                      max={50}
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-white/60">Maximal längd på båt som får ligga här</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Max båtbredd (m)</label>
                    <input
                      value={form.max_boat_width}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_boat_width: e.target.value }))}
                      type="number"
                      min={1}
                      max={15}
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-white/60">Maximal bredd på båt</p>
                  </div>
                  <div className="sm:col-span-2 rounded-lg border border-[#14b8a6]/30 bg-[#0b1b3f]/70 p-3 text-sm text-white/80">
                    <span className="mr-2 text-lg">⛵</span>
                    Längd = fören till aktern, bredd = båtens bredaste punkt.
                  </div>
                </div>
              </section>

              <section className="border-b border-white/10 pb-6">
                <h2 className="text-lg font-bold">Säsong och pris</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Säsongstart</label>
                    <input
                      value={form.season_start}
                      onChange={(e) => setForm((prev) => ({ ...prev, season_start: e.target.value }))}
                      type="date"
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-white/60">Första tillgängliga datum</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Säsongsslut</label>
                    <input
                      value={form.season_end}
                      onChange={(e) => setForm((prev) => ({ ...prev, season_end: e.target.value }))}
                      type="date"
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-white/60">Sista tillgängliga datum</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold">Pris per säsong (SEK)</label>
                    <input
                      value={form.price_per_season}
                      onChange={(e) => setForm((prev) => ({ ...prev, price_per_season: e.target.value }))}
                      type="number"
                      min={1}
                      placeholder="ex. 18500"
                      className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-3 text-lg font-semibold"
                    />
                    <p className="mt-1 text-xs text-white/60">Totalpris för hela säsongen</p>
                  </div>
                </div>
              </section>

              <section className="border-b border-white/10 pb-6">
                <h2 className="text-lg font-bold">Bild (valfritt)</h2>
                <div className="mt-4">
                  <ListingImageUploader existingImages={galleryImages} onChange={setGalleryImages} />
                </div>
              </section>

              <section className="rounded-xl border border-[#14b8a6]/30 bg-[#14b8a6]/10 p-4">
                <h2 className="text-lg font-bold">Skapa flera identiska platser</h2>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
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
                      <label className="mb-2 block text-sm font-semibold">Antal platser att skapa</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={bulkCount}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setBulkCount(Number.isNaN(value) ? 1 : Math.min(Math.max(value, 1), 50));
                        }}
                        className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Namnmönster</label>
                      <input
                        value={namePattern}
                        onChange={(e) => setNamePattern(e.target.value)}
                        placeholder="Brygga A · Plats {N}"
                        className="w-full rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-white/70">
                        Ex: "Brygga A · Plats {"{N}"}", "Kajen {"{N}"}"
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-white/70">
                        Använd {"{N}"} där numret ska vara. Varje plats får samma specs och pris.
                      </p>
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-white/20 bg-[#0b1b3f] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
                        Förhandsvisning
                      </p>
                      {generatedNamesPreview.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-white/85">
                          {generatedNamesPreview.map((name) => (
                            <li key={name}>• {name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-white/60">Lägg till {"{N}"} i namnmönstret för förhandsvisning.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => void submit()}
                disabled={saving || harbours.length === 0}
                className="rounded-lg bg-[#14b8a6] px-6 py-3 text-base font-bold text-[#0b1b3f] disabled:opacity-50"
              >
                {saving ? "Skapar..." : bulkMode ? `Skapa ${bulkCount} platser` : "Skapa plats"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1b3f]" />}>
      <CreateListingContent />
    </Suspense>
  );
}
