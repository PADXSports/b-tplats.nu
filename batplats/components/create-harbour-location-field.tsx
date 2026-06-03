"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DASHBOARD_TEAL } from "@/components/dashboard-icons";
import { HOST_INPUT_CLASS, HOST_LABEL_CLASS } from "@/components/host-dashboard-shell";

type Coordinates = { lat: number; lng: number };

type CreateHarbourLocationFieldProps = {
  lat: number | null;
  lng: number | null;
  onLocationChange: (next: { lat: number; lng: number; city?: string }) => void;
};

const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 };

declare global {
  interface Window {
    google?: any;
  }
}

function tealMarkerIcon(googleMaps: { SymbolPath: { CIRCLE: unknown } }) {
  return {
    path: googleMaps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: "#0d9488",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

export default function CreateHarbourLocationField({
  lat,
  lng,
  onLocationChange,
}: CreateHarbourLocationFieldProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [addressInput, setAddressInput] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    lat != null && lng != null ? { lat, lng } : null,
  );
  const [searching, setSearching] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const applyPosition = useCallback((pos: Coordinates, city?: string) => {
    setCoordinates(pos);
    onLocationChangeRef.current({ lat: pos.lat, lng: pos.lng, city });
  }, []);

  const placeOrMoveMarker = useCallback(
    (pos: Coordinates) => {
      const map = mapInstanceRef.current;
      const googleMaps = window.google?.maps;
      if (!map || !googleMaps) return;

      if (markerRef.current) {
        markerRef.current.setPosition(pos);
        return;
      }

      markerRef.current = new googleMaps.Marker({
        position: pos,
        map,
        draggable: true,
        icon: tealMarkerIcon(googleMaps),
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (!position) return;
        applyPosition({ lat: position.lat(), lng: position.lng() });
      });
    },
    [applyPosition],
  );

  useEffect(() => {
    if (!apiKey) return;

    if (!document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      const handleLoad = () => setIsApiReady(true);
      script.addEventListener("load", handleLoad);
      document.head.appendChild(script);
      return () => script.removeEventListener("load", handleLoad);
    }

    if (window.google) {
      const timeout = window.setTimeout(() => setIsApiReady(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    const handleScriptReady = () => setIsApiReady(true);
    existingScript?.addEventListener("load", handleScriptReady);
    return () => existingScript?.removeEventListener("load", handleScriptReady);
  }, [apiKey]);

  useEffect(() => {
    if (!isApiReady || !window.google || !mapRef.current || mapInstanceRef.current) return;

    const googleMaps = window.google.maps;
    const hasInitial = lat != null && lng != null;
    const center = hasInitial ? { lat, lng } : STOCKHOLM_CENTER;

    const map = new googleMaps.Map(mapRef.current, {
      center,
      zoom: hasInitial ? 15 : 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    if (hasInitial) {
      placeOrMoveMarker({ lat, lng });
      setCoordinates({ lat, lng });
    }

    map.addListener("click", (e: { latLng?: { lat: () => number; lng: () => number } }) => {
      if (!e.latLng) return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      placeOrMoveMarker(pos);
      applyPosition(pos);
    });

    return () => {
      markerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, [apiKey, isApiReady, applyPosition, placeOrMoveMarker]);

  useEffect(() => {
    if (!mapInstanceRef.current || lat == null || lng == null) return;
    const pos = { lat, lng };
    mapInstanceRef.current.setCenter(pos);
    mapInstanceRef.current.setZoom(15);
    placeOrMoveMarker(pos);
    setCoordinates(pos);
  }, [lat, lng, placeOrMoveMarker]);

  const searchAddress = async () => {
    if (!addressInput.trim()) return;
    setSearching(true);

    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput.trim())}`);
      const result = (await response.json()) as {
        lat?: number;
        lng?: number;
        city?: string;
        error?: string;
      };

      if (result.lat != null && result.lng != null && mapInstanceRef.current) {
        const pos = { lat: result.lat, lng: result.lng };
        mapInstanceRef.current.setCenter(pos);
        mapInstanceRef.current.setZoom(15);
        placeOrMoveMarker(pos);
        applyPosition(pos, result.city);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }

    setSearching(false);
  };

  if (!apiKey) {
    return (
      <p className="text-sm text-gray-500">
        Lägg till NEXT_PUBLIC_GOOGLE_MAPS_API_KEY i .env.local för att välja plats på kartan.
      </p>
    );
  }

  return (
    <div className="mb-4 space-y-3 sm:col-span-2">
      <div>
        <label className={HOST_LABEL_CLASS}>Sök adress eller hamnnamn</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchAddress();
            }}
            placeholder="T.ex. Bockholmens Marina, Solna"
            className={`${HOST_INPUT_CLASS} flex-1 py-3 text-sm`}
          />
          <button
            type="button"
            onClick={() => void searchAddress()}
            disabled={searching}
            className="rounded-xl px-4 py-3 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ background: DASHBOARD_TEAL }}
          >
            {searching ? "..." : "Sök"}
          </button>
        </div>
      </div>

      <div
        ref={mapRef}
        className="w-full overflow-hidden rounded-xl border border-gray-200"
        style={{ height: "200px" }}
      />

      {coordinates ? (
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-600">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Plats vald — du kan dra i nålen för att finjustera</span>
        </div>
      ) : null}
    </div>
  );
}
