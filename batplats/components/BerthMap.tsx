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
  image_url: string | null;
  season_start: string | null;
  season_end: string | null;
  lat: number | null;
  lng: number | null;
};

const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 };
const MAP_STYLE = [
  {
    featureType: "all",
    stylers: [{ saturation: -30 }, { lightness: 10 }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#d4e6f1" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
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
  const [hydratedProvidedListings, setHydratedProvidedListings] = useState<MapListing[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const listings = providedListings ? hydratedProvidedListings : internalListings;
  console.log("🗺️ BerthMap received listings:", listings?.length ?? 0);
  console.log("📍 Sample listing:", listings?.[0] ?? null);

  useEffect(() => {
    if (providedListings) return;

    const loadListings = async () => {
      try {
        const { data: listingsData, error } = await supabase
          .from("listings")
          .select("id, harbour_id, title, harbour_name, city, price_per_season, is_available, image_url, season_start, season_end, lat, lng")
          .eq("is_available", true);

        if (error) {
          console.error(error);
          return;
        }

        const listingIds = ((listingsData ?? []) as Array<Record<string, unknown>>).map((row) => row.id as string | number);
        let imagesByListingId = new Map<string, Array<Record<string, unknown>>>();
        if (listingIds.length > 0) {
          const { data: imagesData, error: imagesError } = await supabase
            .from("listing_images")
            .select("listing_id, image_url, display_order")
            .in("listing_id", listingIds)
            .order("display_order", { ascending: true });
          if (imagesError) {
            console.error("Failed to load listing_images:", imagesError);
          } else {
            imagesByListingId = (imagesData ?? []).reduce((acc, imageRow) => {
              const key = String((imageRow as Record<string, unknown>).listing_id);
              const current = acc.get(key) ?? [];
              current.push(imageRow as Record<string, unknown>);
              acc.set(key, current);
              return acc;
            }, new Map<string, Array<Record<string, unknown>>>());
          }
        }

        const normalized = ((listingsData ?? []) as Array<Record<string, unknown>>).map((row) => {
          const listingImages = imagesByListingId.get(String(row.id)) ?? [];
          return {
            id: row.id as string | number,
            harbour_id: (row.harbour_id as string | number | null | undefined) ?? null,
            title: (row.title as string) ?? "Okänd plats",
            harbour_name: (row.harbour_name as string | null) ?? null,
            city: (row.city as string | null) ?? null,
            price_per_season: (row.price_per_season as number | null) ?? null,
            is_available: (row.is_available as boolean | null) ?? true,
            image_url: (listingImages[0]?.image_url as string | null) ?? (row.image_url as string | null) ?? null,
            season_start: (row.season_start as string | null) ?? null,
            season_end: (row.season_end as string | null) ?? null,
            lat: (row.lat as number | null) ?? null,
            lng: (row.lng as number | null) ?? null,
          } satisfies MapListing;
        });

        console.log("First listing:", listingsData?.[0]);
        console.log(
          "Listings with images:",
          (listingsData ?? []).map((listing) => ({
            id: (listing as Record<string, unknown>).id,
            title: (listing as Record<string, unknown>).title,
            image_url: (listing as Record<string, unknown>).image_url,
          })),
        );
        setInternalListings(normalized);
      } catch (loadError) {
        console.error(loadError);
      }
    };

    void loadListings();
  }, [providedListings, supabase]);

  useEffect(() => {
    if (!providedListings) return;

    const hydrateProvidedListings = async () => {
      const listingIds = providedListings.map((listing) => listing.id);
      if (listingIds.length === 0) {
        setHydratedProvidedListings([]);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("id, image_url, season_start, season_end, harbour_name, city, lat, lng")
        .in("id", listingIds);

      if (error) {
        console.error("Failed to hydrate provided listings:", error);
        setHydratedProvidedListings(
          providedListings.map((listing) => ({
            ...listing,
            image_url: listing.image_url ?? null,
            season_start: listing.season_start ?? null,
            season_end: listing.season_end ?? null,
          })),
        );
        return;
      }

      let imagesByListingId = new Map<string, Array<Record<string, unknown>>>();
      const { data: imagesData, error: imagesError } = await supabase
        .from("listing_images")
        .select("listing_id, image_url, display_order")
        .in("listing_id", listingIds)
        .order("display_order", { ascending: true });
      if (imagesError) {
        console.error("Failed to hydrate listing_images:", imagesError);
      } else {
        imagesByListingId = (imagesData ?? []).reduce((acc, imageRow) => {
          const key = String((imageRow as Record<string, unknown>).listing_id);
          const current = acc.get(key) ?? [];
          current.push(imageRow as Record<string, unknown>);
          acc.set(key, current);
          return acc;
        }, new Map<string, Array<Record<string, unknown>>>());
      }

      const detailsById = new Map(
        ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
          const listingImages = imagesByListingId.get(String(row.id)) ?? [];
          return [
            String(row.id),
            {
              image_url: (listingImages[0]?.image_url as string | null | undefined) ?? (row.image_url as string | null) ?? null,
              season_start: (row.season_start as string | null) ?? null,
              season_end: (row.season_end as string | null) ?? null,
              harbour_name: (row.harbour_name as string | null) ?? null,
              city: (row.city as string | null) ?? null,
              lat: (row.lat as number | null) ?? null,
              lng: (row.lng as number | null) ?? null,
            },
          ];
        }),
      );

      const merged = providedListings.map((listing) => {
        const details = detailsById.get(String(listing.id));
        return {
          ...listing,
          image_url: details?.image_url ?? listing.image_url ?? null,
          season_start: details?.season_start ?? listing.season_start ?? null,
          season_end: details?.season_end ?? listing.season_end ?? null,
          harbour_name: details?.harbour_name ?? listing.harbour_name ?? null,
          city: details?.city ?? listing.city ?? null,
          lat: details?.lat ?? listing.lat ?? null,
          lng: details?.lng ?? listing.lng ?? null,
        } satisfies MapListing;
      });

      console.log(
        "Hydrated provided listings with images:",
        merged.map((listing) => ({ id: listing.id, image_url: listing.image_url })),
      );
      setHydratedProvidedListings(merged);
    };

    void hydrateProvidedListings();
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
      class PriceMarker extends googleMaps.OverlayView {
        position: any;
        containerDiv: HTMLDivElement;
        listingsAtLocation: MapListing[];
        currentIndex: number;

        constructor(position: any, price: number, listingsAtLocation: MapListing[]) {
          super();
          this.position = position;
          this.listingsAtLocation = listingsAtLocation;
          this.currentIndex = 0;
          this.containerDiv = document.createElement("div");
          this.containerDiv.className = "price-marker";
          const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
          this.containerDiv.innerHTML = `
            <div style="
              background: white;
              padding: ${isMobile ? "5px 10px" : "6px 12px"};
              border-radius: 20px;
              font-weight: 700;
              font-size: ${isMobile ? "12px" : "14px"};
              color: #222;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              white-space: nowrap;
              cursor: pointer;
              transition: transform 0.2s ease;
              border: 1px solid rgba(15,31,61,0.08);
            " class="price-label">
              ${Math.max(price ?? 0, 0).toLocaleString("sv-SE")} kr
            </div>
          `;
          this.containerDiv.addEventListener("mouseenter", () => {
            const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
            if (!label) return;
            label.style.transform = "scale(1.08)";
            label.style.zIndex = "1000";
          });
          this.containerDiv.addEventListener("mouseleave", () => {
            const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
            if (!label) return;
            label.style.transform = "scale(1)";
            label.style.zIndex = "auto";
          });
          this.containerDiv.addEventListener("click", () => {
            this.showPreviewCard();
          });
        }

        formatDate(dateValue: string | null | undefined) {
          if (!dateValue) return "-";
          const parsed = new Date(dateValue);
          if (Number.isNaN(parsed.getTime())) return "-";
          return parsed.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
        }

        showPreviewCard() {
          document.querySelectorAll(".map-preview-card").forEach((el) => el.remove());
          const listing = this.listingsAtLocation[this.currentIndex];
          if (!listing) return;
          console.log("Showing preview for:", {
            title: listing.title,
            image_url: listing.image_url,
            has_image: !!listing.image_url,
          });
          const hasMultiple = this.listingsAtLocation.length > 1;
          const card = document.createElement("div");
          card.className = "map-preview-card";
          card.style.cssText = `
            position: fixed;
            width: 340px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 6px 16px rgba(0,0,0,0.12);
            z-index: 1000;
          `;

          card.innerHTML = `
            <div style="position: relative;">
              ${
                hasMultiple
                  ? `
                <button id="prev-btn" style="
                  position:absolute;left:16px;top:100px;transform:translateY(-50%);
                  width:36px;height:36px;background:rgba(255,255,255,0.95);border:none;border-radius:50%;
                  cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);
                  display:flex;align-items:center;justify-content:center;z-index:10;transition:all 0.2s;"
                  onmouseover="this.style.transform='translateY(-50%) scale(1.1)'"
                  onmouseout="this.style.transform='translateY(-50%) scale(1)'">
                  <svg width="16" height="16" viewBox="0 0 32 32">
                    <path d="M20 6L10 16L20 26" stroke="currentColor" stroke-width="3" fill="none"/>
                  </svg>
                </button>
                <button id="next-btn" style="
                  position:absolute;right:16px;top:100px;transform:translateY(-50%);
                  width:36px;height:36px;background:rgba(255,255,255,0.95);border:none;border-radius:50%;
                  cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);
                  display:flex;align-items:center;justify-content:center;z-index:10;transition:all 0.2s;"
                  onmouseover="this.style.transform='translateY(-50%) scale(1.1)'"
                  onmouseout="this.style.transform='translateY(-50%) scale(1)'">
                  <svg width="16" height="16" viewBox="0 0 32 32">
                    <path d="M12 6L22 16L12 26" stroke="currentColor" stroke-width="3" fill="none"/>
                  </svg>
                </button>
                <div style="
                  position:absolute;top:16px;left:50%;transform:translateX(-50%);
                  background:rgba(34,34,34,0.8);color:white;padding:6px 14px;border-radius:16px;
                  font-size:14px;font-weight:600;z-index:10;backdrop-filter:blur(8px);">
                  ${this.currentIndex + 1} av ${this.listingsAtLocation.length}
                </div>`
                  : ""
              }
              ${
                listing.image_url
                  ? `
                <img 
                  src="${listing.image_url}" 
                  alt="${listing.title}"
                  style="width: 100%; height: 200px; object-fit: cover;"
                  onload="console.log('Image loaded:', '${listing.title}')"
                  onerror="console.error('Image failed to load:', '${listing.image_url}')"
                />`
                  : `
                <div style="width: 100%; height: 200px; background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px;">
                  Ingen bild
                </div>`
              }
              <div style="position:absolute;top:12px;right:12px;display:flex;gap:8px;z-index:10;">
                <div id="favorite-btn" style="
                  width:32px;height:32px;background:white;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;
                  cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 18s-1-1-5-5c-3-3-3-6-2-8 1-2 3-3 5-2 1 1 2 2 2 2s1-1 2-2c2-1 4 0 5 2 1 2 1 5-2 8-4 4-5 5-5 5z"/>
                  </svg>
                </div>
                <div id="close-btn" style="
                  width:32px;height:32px;background:white;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;
                  cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);">
                  <svg width="16" height="16"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2"/></svg>
                </div>
              </div>
            </div>
            <div style="padding:16px;">
              <div style="font-size:16px;font-weight:600;color:#222;margin-bottom:4px;">${listing.title}</div>
              <div style="font-size:14px;color:#717171;margin-bottom:8px;">${listing.harbour_name ?? "Hamn"} • ${listing.city ?? "Stockholm"}</div>
              <div style="font-size:14px;color:#717171;margin-bottom:8px;">
                ${this.formatDate(listing.season_start)} – ${this.formatDate(listing.season_end)}
              </div>
              <div style="font-size:16px;font-weight:600;color:#222;">
                Totalt ${(listing.price_per_season ?? 0).toLocaleString("sv-SE")} kr SEK
              </div>
            </div>
          `;

          document.body.appendChild(card);
          const rect = this.containerDiv.getBoundingClientRect();
          const cardWidth = 340;
          const cardHeight = 380;
          let left = rect.left - cardWidth / 2 + rect.width / 2;
          let top = rect.top - cardHeight - 10;
          if (left < 10) left = 10;
          if (left + cardWidth > window.innerWidth - 10) left = window.innerWidth - cardWidth - 10;
          if (top < 10) top = rect.bottom + 10;
          card.style.left = `${left}px`;
          card.style.top = `${top}px`;

          if (hasMultiple) {
            card.querySelector("#prev-btn")?.addEventListener("click", (event) => {
              event.stopPropagation();
              this.currentIndex = (this.currentIndex - 1 + this.listingsAtLocation.length) % this.listingsAtLocation.length;
              this.showPreviewCard();
            });
            card.querySelector("#next-btn")?.addEventListener("click", (event) => {
              event.stopPropagation();
              this.currentIndex = (this.currentIndex + 1) % this.listingsAtLocation.length;
              this.showPreviewCard();
            });
          }

          card.querySelector("#close-btn")?.addEventListener("click", () => card.remove());
          card.querySelector("#favorite-btn")?.addEventListener("click", (event) => {
            event.stopPropagation();
            alert("Favoriter kommer snart!");
          });
          card.addEventListener("click", (event) => {
            if (!(event.target as HTMLElement).closest("button")) {
              window.location.href = `/listings/${listing.id}`;
            }
          });
        }

        onAdd() {
          const panes = this.getPanes();
          panes?.overlayMouseTarget.appendChild(this.containerDiv);
        }

        draw() {
          const projection = this.getProjection();
          const pos = projection.fromLatLngToDivPixel(this.position);
          if (!pos) return;
          this.containerDiv.style.left = `${pos.x}px`;
          this.containerDiv.style.top = `${pos.y}px`;
          this.containerDiv.style.position = "absolute";
          this.containerDiv.style.transform = "translate(-50%, -50%)";
        }

        onRemove() {
          if (this.containerDiv.parentElement) {
            this.containerDiv.parentElement.removeChild(this.containerDiv);
          }
        }
      }
      const listingsByLocation = new Map<string, MapListing[]>();
      listings.forEach((listing) => {
        const lat = Number(listing.lat);
        const lng = Number(listing.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const key = `${lat},${lng}`;
        if (!listingsByLocation.has(key)) {
          listingsByLocation.set(key, []);
        }
        listingsByLocation.get(key)?.push(listing);
      });

      listingsByLocation.forEach((locationListings, coords) => {
        locationListings.forEach((listing) => {
          console.log("Listing data:", listing);
        });
        const [lat, lng] = coords.split(",").map(Number);
        const position = new googleMaps.LatLng(lat, lng);
        const lowestPrice = Math.min(...locationListings.map((l) => l.price_per_season ?? 0));
        const marker = new PriceMarker(position, lowestPrice, locationListings);
        marker.setMap(map);
        bounds.extend({ lat, lng });
        markersRef.current.push(marker);
      });

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
      document.querySelectorAll(".map-preview-card").forEach((el) => el.remove());
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
