"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type BerthMapProps = {
  height?: string;
};

type MapListing = {
  id: number | string;
  title: string;
  harbour_name: string | null;
  city: string | null;
  price_per_season: number | null;
  is_available: boolean;
  lat: number;
  lng: number;
};

const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 };
const MAP_STYLE = [{ featureType: "all", stylers: [{ saturation: -60 }] }];

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function BerthMap({ height = "480px" }: BerthMapProps) {
  const supabase = useMemo(() => createClient(), []);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isApiReady, setIsApiReady] = useState(false);
  const [listings, setListings] = useState<MapListing[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const loadListings = async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("id, title, harbour_name, city, price_per_season, is_available, lat, lng")
          .not("lat", "is", null)
          .not("lng", "is", null);

        if (error) {
          console.error(error);
          return;
        }

        setListings((data ?? []) as MapListing[]);
      } catch (loadError) {
        console.error(loadError);
      }
    };

    void loadListings();
  }, [supabase]);

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
      center: STOCKHOLM_CENTER,
      zoom: 11,
      styles: MAP_STYLE as google.maps.MapTypeStyle[],
      mapId: "DEMO_MAP_ID",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = map;
  }, [isApiReady]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    const map = mapRef.current;
    const googleMaps = window.google.maps;
    let mounted = true;

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];

    const drawMarkers = async () => {
      const markerLib = await googleMaps.importLibrary("marker");
      const { AdvancedMarkerElement } = markerLib as google.maps.MarkerLibrary;
      if (!mounted) return;

      listings.forEach((listing) => {
        const marker = new AdvancedMarkerElement({
          position: { lat: listing.lat, lng: listing.lng },
          map,
          title: listing.title,
        });

        const infoWindow = new googleMaps.InfoWindow({
          content: `
            <div style="padding:8px;min-width:200px">
              <h3 style="margin:0 0 4px;color:#0f172a">${listing.title}</h3>
              <p style="margin:0 0 4px;color:#64748b;font-size:13px">${listing.harbour_name ?? listing.city ?? "Hamn"}</p>
              <p style="margin:0 0 8px;font-weight:600">${(listing.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong</p>
              <span style="background:${listing.is_available ? "#dcfce7" : "#f1f5f9"};
                color:${listing.is_available ? "#16a34a" : "#64748b"};
                padding:2px 8px;border-radius:999px;font-size:12px">
                ${listing.is_available ? "Tillgänglig" : "Ej tillgänglig"}
              </span>
              <br/><br/>
              <a href="/listings/${listing.id}" 
                style="color:#0d9488;font-weight:600;text-decoration:none">
                Visa mer →
              </a>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open({ anchor: marker, map });
        });
        markersRef.current.push(marker);
      });
    };

    void drawMarkers();
    return () => {
      mounted = false;
    };
  }, [listings]);

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
