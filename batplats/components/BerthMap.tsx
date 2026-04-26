"use client";

import { useEffect, useRef, useState } from "react";

import { mockBerths } from "@/lib/mock-berths";

type BerthMapProps = {
  height?: string;
};

const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 };
const MAP_STYLE = [{ featureType: "all", stylers: [{ saturation: -60 }] }];

const availabilityMeta = {
  available: { label: "Available", color: "#15803d", bg: "#dcfce7" },
  limited: { label: "Limited", color: "#854d0e", bg: "#fef9c3" },
  booked: { label: "Booked", color: "#b91c1c", bg: "#fee2e2" },
} as const;

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function BerthMap({ height = "480px" }: BerthMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;

    if (window.google) {
      setIsApiReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      const handleLoad = () => setIsApiReady(true);
      script.addEventListener("load", handleLoad);
      document.head.appendChild(script);
      return () => {
        script.removeEventListener("load", handleLoad);
      };
    }

    const handleScriptReady = () => setIsApiReady(true);
    existingScript.addEventListener("load", handleScriptReady);
    return () => existingScript.removeEventListener("load", handleScriptReady);
  }, [apiKey]);

  useEffect(() => {
    if (!isApiReady || !window.google || !mapElementRef.current || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const googleMaps = window.google.maps;

    const map = new googleMaps.Map(mapElementRef.current, {
      center: STOCKHOLM_CENTER,
      zoom: 11,
      styles: MAP_STYLE as google.maps.MapTypeStyle[],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const pinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42"><path fill="#0d9488" d="M17 0c-9.4 0-17 7.6-17 17 0 12.8 17 25 17 25s17-12.2 17-25C34 7.6 26.4 0 17 0z"/><circle cx="17" cy="17" r="6.5" fill="#ffffff"/></svg>`,
    )}`;

    mockBerths.forEach((berth) => {
      const marker = new googleMaps.Marker({
        position: { lat: berth.lat, lng: berth.lng },
        map,
        title: berth.name,
        icon: {
          url: pinSvg,
          scaledSize: new googleMaps.Size(34, 42),
        },
      });

      const availability = availabilityMeta[berth.availability];
      const infoWindow = new googleMaps.InfoWindow({
        content: `
          <div style="font-family: Arial, sans-serif; min-width: 240px; padding: 2px 2px 0;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #0d9488;">
              ${berth.marinaName}
            </p>
            <h3 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0a2342;">${berth.name}</h3>
            <p style="margin: 0 0 10px; font-size: 13px; color: #64748b;">${berth.pricePerMonth.toLocaleString("sv-SE")} SEK / month</p>
            <span style="display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: ${availability.bg}; color: ${availability.color};">
              ${availability.label}
            </span>
            <div>
              <a href="/listings/${berth.id}" style="font-size: 13px; color: #0d9488; text-decoration: none; font-weight: 600;">
                Visa mer →
              </a>
            </div>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open({ anchor: marker, map });
      });
    });
  }, [isApiReady]);

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white text-sm text-[#64748b]"
        style={{ height }}
      >
        Lägg till NEXT_PUBLIC_GOOGLE_MAPS_API_KEY i .env.local
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#e2e8f0] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div
        ref={mapElementRef}
        style={{ height, width: "100%", borderRadius: "12px" }}
      />
    </div>
  );
}
