"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DASHBOARD_NAVY, DASHBOARD_TEAL } from "@/components/dashboard-icons";
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

  const deleteHarbour = async (harbourId: string | number) => {
    const harbour = harbours.find((h) => String(h.id) === String(harbourId));
    const harbourName = harbour?.name ?? "denna hamn";
    const confirmed = window.confirm(
      `Är du säker på att du vill ta bort ${harbourName}? Detta tar bort hamnen och alla dess platser permanent.`,
    );
    if (!confirmed) return;

    setDeletingHarbourId(harbourId);
    const { error } = await supabase.from("harbours").delete().eq("id", harbourId);
    if (error) {
      setToast({ type: "error", message: "Kunde inte ta bort hamnen." });
      setDeletingHarbourId(null);
      return;
    }

    setHarbours((prev) => prev.filter((item) => String(item.id) !== String(harbourId)));
    setToast({ type: "success", message: "Hamn borttagen." });
    setDeletingHarbourId(null);
  };

  if (loading) {
    return HOST_LOADING_FALLBACK;
  }

  return (
    <HostDashboardShell
      activeNav="hamnar"
      pageTitle="Mina hamnar"
      headerAction={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className={HOST_PRIMARY_BTN}
          style={{ background: DASHBOARD_TEAL }}
        >
          Skapa ny hamn
        </button>
      }
    >
      <HostToast toast={toast} />

      {harbours.length === 0 ? (
        <div className={`${hostCardClass} p-6 text-sm text-gray-500`}>
          Du har inga hamnar ännu. Klicka på <span className="font-semibold text-gray-900">Skapa ny hamn</span> för att
          komma igång.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {harbours.map((harbour) => (
            <div
              key={harbour.id}
              className={`${hostCardClass} p-6 transition hover:shadow-md`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-lg font-bold" style={{ color: DASHBOARD_NAVY }}>
                    {harbour.name ?? "Namnlös hamn"}
                  </h3>
                  <p className="text-sm text-gray-500">{harbour.city ?? "Stad saknas"}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    harbour.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {harbour.is_active ? "Aktiv" : "Inaktiv"}
                </span>
              </div>

              <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
                <span>{harbour.listingCount} platser</span>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <Link
                  href={`/dashboard/host/hamnar/${harbour.id}`}
                  className="flex-1 rounded-xl py-2.5 text-center text-sm font-medium text-white transition"
                  style={{ background: DASHBOARD_TEAL }}
                >
                  Hantera →
                </Link>
                <button
                  type="button"
                  onClick={() => void deleteHarbour(harbour.id)}
                  disabled={deletingHarbourId === harbour.id}
                  className={HOST_DANGER_BTN}
                >
                  {deletingHarbourId === harbour.id ? "Tar bort..." : "Ta bort"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${hostCardClass} w-full max-w-xl p-6`}>
            <h2 className="text-xl font-bold text-gray-900">Skapa ny hamn</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Hamnnamn"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Stad"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={form.lat}
                onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                placeholder="Latitud"
                className={HOST_INPUT_CLASS}
              />
              <input
                value={form.lng}
                onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                placeholder="Longitud"
                className={HOST_INPUT_CLASS}
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning"
                className={`${HOST_INPUT_CLASS} sm:col-span-2 min-h-28`}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={HOST_SECONDARY_BTN}
                disabled={creating}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void createHarbour()}
                className={HOST_PRIMARY_BTN}
                style={{ background: DASHBOARD_TEAL }}
                disabled={creating}
              >
                {creating ? "Sparar..." : "Skapa hamn"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </HostDashboardShell>
  );
}

export default function HamnarPage() {
  return (
    <Suspense fallback={HOST_LOADING_FALLBACK}>
      <HamnarContent />
    </Suspense>
  );
}
