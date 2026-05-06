"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AuthNavbar from "@/components/auth-navbar";
import { createClient } from "@/lib/supabase/client";

type HarbourRow = {
  id: number | string;
  name: string | null;
  city: string | null;
  is_active: boolean | null;
};

type HarbourWithCount = HarbourRow & {
  listingCount: number;
};

function HamnarContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [harbours, setHarbours] = useState<HarbourWithCount[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingHarbourId, setDeletingHarbourId] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    city: "",
    description: "",
    lat: "",
    lng: "",
  });

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.replace("/login?redirect=/dashboard/host/hamnar");
        return;
      }

      const { data: harbourRows, error: harbourError } = await supabase
        .from("harbours")
        .select("id, name, city, is_active")
        .eq("owner_id", user.id)
        .order("name", { ascending: true });

      if (harbourError) {
        setToast({ type: "error", message: "Kunde inte hämta hamnar." });
        setLoading(false);
        return;
      }

      const baseHarbours = (harbourRows ?? []) as HarbourRow[];
      const harbourIds = baseHarbours.map((h) => h.id);

      const counts = new Map<string, number>();
      if (harbourIds.length > 0) {
        const { data: listingRows } = await supabase.from("listings").select("id, harbour_id").in("harbour_id", harbourIds);
        for (const row of (listingRows ?? []) as Array<{ harbour_id: string | number | null }>) {
          if (!row.harbour_id) continue;
          const key = String(row.harbour_id);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }

      setHarbours(baseHarbours.map((h) => ({ ...h, listingCount: counts.get(String(h.id)) ?? 0 })));
      setLoading(false);
    };

    void init();
  }, [router, supabase]);

  const createHarbour = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      setToast({ type: "error", message: "Namn och stad krävs." });
      return;
    }
    setCreating(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      router.replace("/login?redirect=/dashboard/host/hamnar");
      return;
    }

    const payload: Record<string, string | number | boolean | null> = {
      owner_id: user.id,
      name: form.name.trim(),
      city: form.city.trim(),
      description: form.description.trim() || null,
      is_active: true,
      lat: form.lat.trim() ? Number(form.lat) : null,
      lng: form.lng.trim() ? Number(form.lng) : null,
    };

    const { data, error } = await supabase.from("harbours").insert(payload).select("id, name, city, is_active").single();
    if (error) {
      setToast({ type: "error", message: "Kunde inte skapa hamnen." });
      setCreating(false);
      return;
    }

    const harbour = data as HarbourRow;
    setHarbours((prev) => [...prev, { ...harbour, listingCount: 0 }].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "sv")));
    setForm({ name: "", city: "", description: "", lat: "", lng: "" });
    setShowCreateModal(false);
    setToast({ type: "success", message: "Hamn skapad." });
    setCreating(false);
  };

  const deleteHarbour = async (harbour: HarbourWithCount) => {
    const harbourName = harbour.name ?? "denna hamn";
    const confirmed = window.confirm(
      `Är du säker på att du vill ta bort ${harbourName}? Detta tar bort hamnen och alla dess platser permanent.`,
    );
    if (!confirmed) return;

    setDeletingHarbourId(harbour.id);
    const { error } = await supabase.from("harbours").delete().eq("id", harbour.id);
    if (error) {
      setToast({ type: "error", message: "Kunde inte ta bort hamnen." });
      setDeletingHarbourId(null);
      return;
    }

    setHarbours((prev) => prev.filter((item) => String(item.id) !== String(harbour.id)));
    setToast({ type: "success", message: "Hamn borttagen." });
    setDeletingHarbourId(null);
  };

  return (
    <main className="min-h-screen bg-[#0b1b3f] text-white">
      <AuthNavbar currentPage="dashboard" />
      <section className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#14b8a6]">Host dashboard</p>
            <h1 className="text-2xl font-extrabold">Mina hamnar</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f]"
          >
            Skapa ny hamn
          </button>
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
          <div className="rounded-xl bg-[#122a5d] p-5 text-sm text-white/70">Laddar hamnar...</div>
        ) : harbours.length === 0 ? (
          <div className="rounded-xl bg-[#122a5d] p-5 text-sm text-white/70">
            Du har inga hamnar ännu. Klicka på <span className="font-semibold text-white">Skapa ny hamn</span> för att komma igång.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {harbours.map((harbour) => (
              <article key={harbour.id} className="rounded-xl bg-[#122a5d] p-5">
                <button
                  onClick={() => router.push(`/dashboard/host/hamnar/${harbour.id}`)}
                  className="w-full text-left transition hover:bg-[#173575]"
                >
                  <p className="text-lg font-bold">{harbour.name ?? "Namnlös hamn"}</p>
                  <p className="mt-1 text-sm text-white/70">{harbour.city ?? "Stad saknas"}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="rounded-full bg-white/10 px-2 py-1">{harbour.listingCount} platser</span>
                    <span
                      className={`rounded-full px-2 py-1 font-semibold ${
                        harbour.is_active ? "bg-[#dff5ea] text-[#2d9e6b]" : "bg-[#dce3ee] text-[#6b7a8f]"
                      }`}
                    >
                      {harbour.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => void deleteHarbour(harbour)}
                  disabled={deletingHarbourId === harbour.id}
                  className="mt-4 rounded-md bg-[#dc2626] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60"
                >
                  {deletingHarbourId === harbour.id ? "Tar bort..." : "Ta bort"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#10234f] p-5">
            <h2 className="text-xl font-bold">Skapa ny hamn</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Hamnnamn"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Stad"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.lat}
                onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                placeholder="Latitud"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <input
                value={form.lng}
                onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                placeholder="Longitud"
                className="rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className="sm:col-span-2 min-h-28 rounded-lg border border-white/20 bg-[#0b1b3f] px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm"
                disabled={creating}
              >
                Avbryt
              </button>
              <button
                onClick={() => void createHarbour()}
                className="rounded-lg bg-[#14b8a6] px-4 py-2 text-sm font-semibold text-[#0b1b3f] disabled:opacity-50"
                disabled={creating}
              >
                {creating ? "Sparar..." : "Skapa hamn"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function HamnarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1b3f]" />}>
      <HamnarContent />
    </Suspense>
  );
}
