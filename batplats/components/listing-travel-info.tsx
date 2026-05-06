"use client";

import { useEffect, useState } from "react";

type ListingTravelInfoProps = {
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string;
};

export default function ListingTravelInfo({
  destinationLat,
  destinationLng,
  destinationLabel,
}: ListingTravelInfoProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceText, setDistanceText] = useState<string | null>(null);
  const [driveText, setDriveText] = useState<string | null>(null);
  const storageKey = "batplats.userLocation";
  const deniedKey = "batplats.userLocationDenied";

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!navigator.geolocation) return;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { lat: number; lng: number };
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      } catch {
        // Ignore malformed cache and request again.
      }
    }
    if (localStorage.getItem(deniedKey) === "1") return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
        localStorage.removeItem(deniedKey);
      },
      () => {
        localStorage.setItem(deniedKey, "1");
      },
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    const origins = `${userLocation.lat},${userLocation.lng}`;
    const destinations = `${destinationLat},${destinationLng}`;
    const url = `/api/distance?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}`;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(url);
        const payload = (await response.json()) as {
          rows?: Array<{ elements?: Array<{ status?: string; distance?: { text?: string }; duration?: { text?: string } }> }>;
        };
        const element = payload.rows?.[0]?.elements?.[0];
        if (cancelled || element?.status !== "OK") return;
        setDistanceText(element.distance?.text ?? null);
        setDriveText(element.duration?.text ?? null);
      } catch (error) {
        console.error("Distance matrix on listing detail failed:", error);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [destinationLat, destinationLng, userLocation]);

  if (!userLocation || (!distanceText && !driveText)) return null;

  return (
    <div className="mt-6 rounded-lg border border-[#dce3ee] bg-[#f5f0e8] p-6">
      <p
        className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#0d9488]"
        style={{ fontFamily: '"DM Sans", sans-serif' }}
      >
        AVSTÅND & RESTID
      </p>
      <div className="mt-2 flex items-center gap-2">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-[#0d9488]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <p
          className="text-[18px] font-medium leading-tight text-[#1e293b]"
          style={{ fontFamily: '"DM Sans", sans-serif' }}
        >
          {distanceText ?? "-"} • {driveText ? `${driveText} med bil` : "-"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${userLocation.lat},${userLocation.lng}`)}&destination=${encodeURIComponent(`${destinationLat},${destinationLng}`)}&travelmode=driving`;
          window.open(url, "_blank", "noopener,noreferrer");
        }}
        className="mt-4 ml-auto inline-flex text-sm font-semibold text-[#0d9488] transition hover:underline"
        style={{ fontFamily: '"DM Sans", sans-serif' }}
      >
        Få vägbeskrivning &rarr;
      </button>
      <p className="mt-1 text-right text-xs text-[#6b7a8f]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
        till {destinationLabel}
      </p>
    </div>
  );
}

