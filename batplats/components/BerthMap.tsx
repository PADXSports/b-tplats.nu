"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type BerthMapProps = {
  height?: string;
  listings?: MapListing[];
  shouldFitBounds?: boolean;
  center?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  defaultZoom?: number;
  groupByHarbour?: boolean;
};

export type MapListing = {
  id: number | string;
  harbour_id: number | string | null | undefined;
  title: string;
  harbour_name: string | null;
  city: string | null;
  price_per_season: number | null;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
};

const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 };
const MAP_STYLE = [
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1e3a5f" }, { saturation: 15 }, { lightness: -10 }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#14b8a6" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1e3a5f" }, { weight: 2 }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }, { weight: 0.8 }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 3 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e0f2e9" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }, { weight: 0.5 }],
  },
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
];

declare global {
  interface Window {
    google?: any;
  }
}

export default function BerthMap({
  height = "480px",
  listings: providedListings,
  shouldFitBounds = false,
  center = null,
  radiusKm = null,
  defaultZoom = 11,
  groupByHarbour = false,
}: BerthMapProps) {
  const supabase = useMemo(() => createClient(), []);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const radiusCircleRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [internalListings, setInternalListings] = useState<MapListing[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const listings = providedListings ?? internalListings;
  console.log("🗺️ BerthMap received listings:", listings?.length ?? 0);
  console.log("📍 Sample listing:", listings?.[0] ?? null);

  useEffect(() => {
    if (providedListings) return;

    const loadListings = async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("id, harbour_id, title, harbour_name, city, price_per_season, is_available, lat, lng")
          .not("lat", "is", null)
          .not("lng", "is", null);

        if (error) {
          console.error(error);
          return;
        }

        setInternalListings((data ?? []) as MapListing[]);
      } catch (loadError) {
        console.error(loadError);
      }
    };

    void loadListings();
  }, [providedListings, supabase]);

  useEffect(() => {
    if (!apiKey) return;
    const initMap = () => {
      if (!mapElementRef.current) {
        console.log("Map container not ready");
        return;
      }
      if (!window.google?.maps?.Map) {
        console.error("Google Maps API not available");
        return;
      }
      if (initializedRef.current && mapRef.current) {
        setMapReady(true);
        return;
      }

      console.log("Initializing Google Map");
      try {
        const mapInstance = new window.google.maps.Map(mapElementRef.current, {
          center: STOCKHOLM_CENTER,
          zoom: defaultZoom,
          styles: MAP_STYLE as any[],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = mapInstance;
        initializedRef.current = true;
        setMapReady(true);
        console.log("Map initialized successfully");
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    if (window.google?.maps?.Map) {
      console.log("Google Maps already loaded, initializing...");
      initMap();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log("Google Maps script already loading, waiting...");
      existingScript.addEventListener(
        "load",
        () => {
          console.log("Google Maps loaded via existing script");
          initMap();
        },
        { once: true },
      );
      return;
    }

    console.log("Loading Google Maps script...");
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("Google Maps script loaded successfully");
      setTimeout(() => {
        if (window.google?.maps?.Map) {
          initMap();
        } else {
          console.error("Google Maps loaded but Map constructor not available");
        }
      }, 100);
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  }, [apiKey, defaultZoom]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || !listings?.length) {
      console.log("Waiting for map or listings:", {
        map: Boolean(mapReady && mapRef.current && window.google),
        listingsCount: listings?.length ?? 0,
      });
      return;
    }
    const map = mapRef.current;
    const googleMaps = window.google.maps;
    let mounted = true;

    markersRef.current.forEach((marker) => {
      if (typeof marker.setMap === "function") {
        marker.setMap(null);
      } else {
        marker.map = null;
      }
    });
    markersRef.current = [];

    const drawMarkers = async () => {
      if (!mounted) return;

      const bounds = new googleMaps.LatLngBounds();
      const markerGroups = groupByHarbour
        ? Array.from(
            listings.reduce((acc, listing) => {
              const lat = Number(listing.lat);
              const lng = Number(listing.lng);
              if (Number.isNaN(lat) || Number.isNaN(lng)) {
                console.warn("⚠️ Skipping listing - no coordinates:", listing.id);
                return acc;
              }
              console.log("Creating marker for:", listing.id, listing.harbour_name ?? listing.city ?? "Hamn", lat, lng);
              const key = listing.harbour_id != null ? `harbour:${String(listing.harbour_id)}` : `coords:${lat}:${lng}`;
              const current = acc.get(key) ?? [];
              current.push(listing);
              acc.set(key, current);
              return acc;
            }, new Map<string, MapListing[]>()),
          )
        : listings
            .map((listing) => {
              const lat = Number(listing.lat);
              const lng = Number(listing.lng);
              if (Number.isNaN(lat) || Number.isNaN(lng)) {
                console.warn("⚠️ Skipping listing - no coordinates:", listing.id);
                return null;
              }
              console.log("Creating marker for:", listing.id, listing.harbour_name ?? listing.city ?? "Hamn", lat, lng);
              return [String(listing.id), [listing] as MapListing[]] as [string, MapListing[]];
            })
            .filter((entry): entry is [string, MapListing[]] => entry != null);

      markerGroups.forEach(([, group]) => {
        const listing = group[0];
        if (!listing) return;
        const lat = Number(listing.lat);
        const lng = Number(listing.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("⚠️ Skipping listing - invalid coordinates:", listing.id, listing.lat, listing.lng);
          return;
        }
        console.log("Creating marker at:", lat, lng);

        const marker = new googleMaps.Marker({
          position: { lat, lng },
          map,
          title:
            groupByHarbour && group.length > 1
              ? `${listing.harbour_name ?? listing.city ?? "Hamn"} (${group.length} platser)`
              : listing.title,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            fillColor: "#0d9488",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
            scale: 12,
          },
          animation: googleMaps.Animation.DROP,
        });
        bounds.extend({ lat, lng });

        const listingsAtThisHarbour = groupByHarbour
          ? group
          : listings.filter((candidate) => {
              if (listing.harbour_id != null && candidate.harbour_id != null) {
                return String(candidate.harbour_id) === String(listing.harbour_id);
              }
              return Number(candidate.lat) === lat && Number(candidate.lng) === lng;
            });
        const hasMultiple = listingsAtThisHarbour.length > 1;
        let currentListingIndex = Math.max(
          0,
          listingsAtThisHarbour.findIndex((l) => String(l.id) === String(listing.id)),
        );

        const popupRoot = document.createElement("div");
        popupRoot.style.padding = "8px";
        popupRoot.style.minWidth = "220px";
        popupRoot.style.maxWidth = "260px";

        const infoWindow = new googleMaps.InfoWindow({ content: popupRoot });
        const renderPopup = () => {
          const active = listingsAtThisHarbour[currentListingIndex] ?? listing;
          const canGoPrev = currentListingIndex > 0;
          const canGoNext = currentListingIndex < listingsAtThisHarbour.length - 1;
          popupRoot.innerHTML = `
            <div style="transition:opacity 160ms ease;opacity:1">
              ${
                hasMultiple
                  ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
                      <button
                        type="button"
                        data-nav="prev"
                        ${canGoPrev ? "" : "disabled"}
                        style="width:24px;height:24px;border-radius:999px;border:none;cursor:${canGoPrev ? "pointer" : "not-allowed"};
                               background:${canGoPrev ? "#0d9488" : "#dce3ee"};color:${canGoPrev ? "#fff" : "#8a96a8"};font-weight:700"
                        aria-label="Föregående annons"
                      >‹</button>
                      <h3 style="margin:0;color:#0f1f3d;font-size:14px;line-height:1.2;font-weight:700;flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${active.title}
                      </h3>
                      <button
                        type="button"
                        data-nav="next"
                        ${canGoNext ? "" : "disabled"}
                        style="width:24px;height:24px;border-radius:999px;border:none;cursor:${canGoNext ? "pointer" : "not-allowed"};
                               background:${canGoNext ? "#0d9488" : "#dce3ee"};color:${canGoNext ? "#fff" : "#8a96a8"};font-weight:700"
                        aria-label="Nästa annons"
                      >›</button>
                    </div>
                    <p style="margin:0 0 6px;text-align:center;color:#8a96a8;font-size:12px">
                      Listing ${currentListingIndex + 1} av ${listingsAtThisHarbour.length}
                    </p>`
                  : `<h3 style="margin:0 0 4px;color:#0f1f3d">${active.title}</h3>`
              }
              <p style="margin:0 0 4px;color:#8a96a8;font-size:13px">${active.harbour_name ?? active.city ?? "Hamn"}</p>
              <p style="margin:0 0 8px;font-weight:600">${(active.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong</p>
              <span style="background:${active.is_available ? "#dff5ea" : "#ebe6dc"};
                color:${active.is_available ? "#2d9e6b" : "#8a96a8"};
                padding:2px 8px;border-radius:999px;font-size:12px">
                ${active.is_available ? "Tillgänglig" : "Ej tillgänglig"}
              </span>
              <br/><br/>
              <a href="/listings/${active.id}"
                style="color:#0d9488;font-weight:600;text-decoration:none">
                Visa mer →
              </a>
            </div>
          `;

          const prevBtn = popupRoot.querySelector<HTMLButtonElement>('button[data-nav="prev"]');
          const nextBtn = popupRoot.querySelector<HTMLButtonElement>('button[data-nav="next"]');
          prevBtn?.addEventListener("click", () => {
            if (currentListingIndex <= 0) return;
            currentListingIndex -= 1;
            renderPopup();
          });
          nextBtn?.addEventListener("click", () => {
            if (currentListingIndex >= listingsAtThisHarbour.length - 1) return;
            currentListingIndex += 1;
            renderPopup();
          });
        };

        const handleKeydown = (event: KeyboardEvent) => {
          if (!hasMultiple) {
            if (event.key === "Escape") infoWindow.close();
            return;
          }
          if (event.key === "ArrowLeft" && currentListingIndex > 0) {
            currentListingIndex -= 1;
            renderPopup();
          } else if (event.key === "ArrowRight" && currentListingIndex < listingsAtThisHarbour.length - 1) {
            currentListingIndex += 1;
            renderPopup();
          } else if (event.key === "Escape") {
            infoWindow.close();
          }
        };

        marker.addListener("click", () => {
          renderPopup();
          infoWindow.open({ anchor: marker, map });
          window.addEventListener("keydown", handleKeydown);
        });
        infoWindow.addListener("closeclick", () => {
          window.removeEventListener("keydown", handleKeydown);
        });
        markersRef.current.push(marker);
      });
      console.log("Created", markersRef.current.length, "markers");

      if (radiusCircleRef.current) {
        radiusCircleRef.current.setMap(null);
        radiusCircleRef.current = null;
      }

      if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        map.setCenter(center);
      }

      if (radiusKm && center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        radiusCircleRef.current = new googleMaps.Circle({
          map,
          center,
          radius: radiusKm * 1000,
          strokeColor: "#0d9488",
          strokeOpacity: 0.5,
          strokeWeight: 1.5,
          fillColor: "#14b8a6",
          fillOpacity: 0.1,
        });
      }

      if (markersRef.current.length > 0) {
        map.fitBounds(bounds);
        googleMaps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom() > 15) map.setZoom(15);
        });
        if (radiusCircleRef.current) {
          const circleBounds = radiusCircleRef.current.getBounds();
          if (circleBounds) {
            bounds.extend(circleBounds.getNorthEast());
            bounds.extend(circleBounds.getSouthWest());
            map.fitBounds(bounds);
          }
        }
      } else {
        map.setCenter(center ?? STOCKHOLM_CENTER);
        map.setZoom(radiusKm ? 12 : defaultZoom);
      }
    };

    void drawMarkers();
    return () => {
      mounted = false;
    };
  }, [listings, shouldFitBounds, center, radiusKm, defaultZoom, groupByHarbour, mapReady]);

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
      <div
        ref={mapElementRef}
        style={{ height, width: "100%", borderRadius: "12px" }}
      />
    </div>
  );
}
