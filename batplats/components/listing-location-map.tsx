"use client";

import { useEffect, useRef, useState } from "react";

type ListingLocationMapProps = {
  lat: number;
  lng: number;
  harbourName: string;
  address?: string | null;
  height?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

const MAP_STYLE = [{ featureType: "all", stylers: [{ saturation: -60 }] }];

export default function ListingLocationMap({
  lat,
  lng,
  harbourName,
  address = null,
  height = "400px",
}: ListingLocationMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const safeHarbourName = harbourName.replace(/"/g, "&quot;");
  const safeAddress = (address ?? "Adress saknas").replace(/"/g, "&quot;");

  useEffect(() => {
    if (!apiKey) return;

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
      script.async = true;
      script.defer = true;
      const handleLoad = () => setIsApiReady(true);
      script.addEventListener("load", handleLoad);
      document.head.appendChild(script);
      return () => {
        script.removeEventListener("load", handleLoad);
      };
    }

    if (window.google) {
      setTimeout(() => setIsApiReady(true), 0);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    const handleScriptReady = () => setIsApiReady(true);
    existingScript?.addEventListener("load", handleScriptReady);
    return () => existingScript?.removeEventListener("load", handleScriptReady);
  }, [apiKey]);

  useEffect(() => {
    if (!isApiReady || !window.google || !mapElementRef.current || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const googleMaps = window.google.maps;
    const map = new googleMaps.Map(mapElementRef.current, {
      center: { lat, lng },
      zoom: 14,
      styles: MAP_STYLE as any[],
      mapId: "DEMO_MAP_ID",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const drawMarker = async () => {
      const markerLib = await googleMaps.importLibrary("marker");
      const { AdvancedMarkerElement } = markerLib as any;
      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title: harbourName,
      });

      const infoWindow = new googleMaps.InfoWindow({
        content: `
          <div style="padding:8px;min-width:240px">
            <h3 style="margin:0 0 6px;color:#0f1f3d">${safeHarbourName}</h3>
            <p style="margin:0 0 10px;color:#6b7a8f;font-size:13px">${safeAddress}</p>
            <a
              href="${mapsUrl}"
              target="_blank"
              rel="noopener noreferrer"
              style="display:inline-block;background:#0d9488;color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none"
            >
              Öppna i Google Maps
            </a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open({ anchor: marker, map });
      });
    };

    void drawMarker();
  }, [address, harbourName, isApiReady, lat, lng, mapsUrl, safeAddress, safeHarbourName]);

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center rounded-[12px] border border-[#dce3ee] bg-white text-sm text-[#8a96a8]"
        style={{ height }}
      >
        Lägg till NEXT_PUBLIC_GOOGLE_MAPS_API_KEY i .env.local
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#dce3ee] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div ref={mapElementRef} style={{ height, width: "100%", borderRadius: "12px" }} />
    </div>
  );
}
