"use client";

import { useEffect, useRef, useState } from "react";

type MapLocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onPick: (next: { lat: number; lng: number; city?: string }) => void;
  height?: string;
};

const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 };

declare global {
  interface Window {
    google?: any;
  }
}

export default function MapLocationPicker({
  lat,
  lng,
  onPick,
  height = "300px",
}: MapLocationPickerProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
      setTimeout(() => setIsApiReady(true), 0);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    const handleScriptReady = () => setIsApiReady(true);
    existingScript?.addEventListener("load", handleScriptReady);
    return () => existingScript?.removeEventListener("load", handleScriptReady);
  }, [apiKey]);

  useEffect(() => {
    if (!isApiReady || !window.google || !mapElementRef.current || mapRef.current) return;

    const googleMaps = window.google.maps;
    const hasInitial = lat != null && lng != null;
    const center = hasInitial ? { lat, lng } : STOCKHOLM_CENTER;

    const map = new googleMaps.Map(mapElementRef.current, {
      center,
      zoom: hasInitial ? 12 : 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = map;

    if (hasInitial) {
      markerRef.current = new googleMaps.Marker({
        position: { lat, lng },
        map,
      });
    }

    map.addListener("click", async (event: any) => {
      if (!event.latLng) return;
      const pickedLat = Number(event.latLng.lat().toFixed(6));
      const pickedLng = Number(event.latLng.lng().toFixed(6));

      if (!markerRef.current) {
        markerRef.current = new googleMaps.Marker({
          position: { lat: pickedLat, lng: pickedLng },
          map,
        });
      } else {
        markerRef.current.setPosition({ lat: pickedLat, lng: pickedLng });
      }

      let detectedCity: string | undefined;
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pickedLat},${pickedLng}&key=${apiKey}`,
        );
        const geocode = await response.json();
        if (Array.isArray(geocode.results) && geocode.results.length > 0) {
          const components = geocode.results[0]?.address_components ?? [];
          const locality = components.find((component: { types?: string[] }) =>
            component.types?.includes("locality"),
          );
          const adminArea = components.find((component: { types?: string[] }) =>
            component.types?.includes("administrative_area_level_1"),
          );
          detectedCity = locality?.long_name ?? adminArea?.long_name;
        }
      } catch (geocodeError) {
        console.error(geocodeError);
      }

      onPick({ lat: pickedLat, lng: pickedLng, city: detectedCity });
    });
  }, [apiKey, isApiReady, lat, lng, onPick]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (lat == null || lng == null) return;

    const googleMaps = window.google.maps;
    const nextPosition = { lat, lng };
    mapRef.current.setCenter(nextPosition);
    if (!markerRef.current) {
      markerRef.current = new googleMaps.Marker({
        position: nextPosition,
        map: mapRef.current,
      });
      return;
    }
    markerRef.current.setPosition(nextPosition);
  }, [lat, lng]);

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#64748b]"
        style={{ height }}
      >
        Lägg till NEXT_PUBLIC_GOOGLE_MAPS_API_KEY i .env.local
      </div>
    );
  }

  return (
    <div
      ref={mapElementRef}
      className="w-full rounded-lg border border-[#e2e8f0]"
      style={{ height }}
    />
  );
}
