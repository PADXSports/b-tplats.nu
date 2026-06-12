"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type MarkerOverlay = {
  setMap: (map: unknown) => void;
  map?: unknown;
  listingIds: Array<string | number>;
  setHighlighted: (highlightedListingId: string | number | null) => void;
};

type BerthMapProps = {
  height?: string;
  listings?: MapListing[];
  shouldFitBounds?: boolean;
  center?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  defaultZoom?: number;
  groupByHarbour?: boolean;
  highlightedListingId?: string | number | null;
  onListingMarkerClick?: (listingId: string | number) => void;
  className?: string;
  borderless?: boolean;
};

export type MapListing = {
  id: number | string;
  harbour_id: number | string | null | undefined;
  title: string;
  harbour_name: string | null;
  city: string | null;
  price_per_season: number | null;
  max_boat_length?: number | null;
  max_boat_width?: number | null;
  is_available: boolean;
  image_url: string | null;
  season_start: string | null;
  season_end: string | null;
  lat: number | null;
  lng: number | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBoatDimensions(listing: MapListing): string {
  const parts: string[] = [];
  if (listing.max_boat_length != null) parts.push(`Max ${listing.max_boat_length} m längd`);
  if (listing.max_boat_width != null) parts.push(`${listing.max_boat_width} m bredd`);
  if (parts.length === 0) return "Max mått ej angivna";
  return parts.join(" · ");
}

function buildSingleListingPreviewHtml(listing: MapListing): string {
  const harbourLabel = `${listing.harbour_name ?? "Hamn"} · ${listing.city ?? "Okänd stad"}`;
  const priceLabel = `${(listing.price_per_season ?? 0).toLocaleString("sv-SE")} SEK` + " / säsong";
  const imageBlock = listing.image_url
    ? [
        '<img src="',
        escapeHtml(listing.image_url),
        '" alt="',
        escapeHtml(listing.title),
        '" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;" />',
      ].join("")
    : '<div style="width:100%;aspect-ratio:16/10;background:#dce3ee;display:flex;align-items:center;justify-content:center;color:#8a96a8;font-size:12px;">Ingen bild</div>';

  return [
    '<div style="position:relative;width:200px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(10,22,40,0.15);font-family:system-ui,sans-serif;cursor:pointer;">',
    '<button type="button" data-close aria-label="Stäng" style="position:absolute;top:8px;right:8px;z-index:2;width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,0.95);color:#0a1628;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.15);">×</button>',
    imageBlock,
    '<div style="padding:12px;">',
    '<div style="font-size:14px;font-weight:700;color:#0a1628;line-height:1.3;margin-bottom:4px;">',
    escapeHtml(listing.title),
    "</div>",
    '<div style="font-size:12px;color:#8a96a8;margin-bottom:6px;">',
    escapeHtml(harbourLabel),
    "</div>",
    '<div style="font-size:13px;font-weight:700;color:#0a1628;margin-bottom:4px;">',
    escapeHtml(priceLabel),
    "</div>",
    '<div style="font-size:12px;color:#8a96a8;">',
    escapeHtml(formatBoatDimensions(listing)),
    "</div>",
    "</div>",
    "</div>",
  ].join("");
}

function buildGroupedListingsPreviewHtml(locationListings: MapListing[]): string {
  const rows = locationListings
    .map((listing) => {
      const priceLabel = `${(listing.price_per_season ?? 0).toLocaleString("sv-SE")} SEK` + " / säsong";
      const lengthLabel =
        listing.max_boat_length != null ? `Max ${listing.max_boat_length} m` : "Max längd okänd";
      const thumb = listing.image_url
        ? [
            '<img src="',
            escapeHtml(listing.image_url),
            '" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;" />',
          ].join("")
        : '<div style="width:56px;height:56px;background:#dce3ee;border-radius:8px;flex-shrink:0;"></div>';

      return [
        '<a href="/listings/',
        String(listing.id),
        '" data-listing-row style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid #e8edf4;text-decoration:none;align-items:center;">',
        thumb,
        '<div style="min-width:0;flex:1;">',
        '<div style="font-size:13px;font-weight:600;color:#0a1628;line-height:1.25;margin-bottom:2px;">',
        escapeHtml(listing.title),
        "</div>",
        '<div style="font-size:12px;font-weight:600;color:#0d9488;margin-bottom:2px;">',
        escapeHtml(priceLabel),
        "</div>",
        '<div style="font-size:11px;color:#8a96a8;">',
        escapeHtml(lengthLabel),
        "</div>",
        "</div>",
        "</a>",
      ].join("");
    })
    .join("");

  return [
    '<div style="width:260px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(10,22,40,0.15);font-family:system-ui,sans-serif;">',
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px 8px;border-bottom:1px solid #e8edf4;">',
    '<div style="font-size:13px;font-weight:700;color:#0a1628;">',
    String(locationListings.length),
    " platser</div>",
    '<button type="button" data-close aria-label="Stäng" style="width:28px;height:28px;border:none;border-radius:50%;background:#f5f0e8;color:#0a1628;font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>',
    "</div>",
    '<div style="max-height:320px;overflow-y:auto;background:#fff;">',
    rows,
    "</div>",
    "</div>",
  ].join("");
}

function positionMapPreviewCard(card: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const cardWidth = card.offsetWidth || 200;
  const cardHeight = card.offsetHeight || 280;
  let left = rect.left - cardWidth / 2 + rect.width / 2;
  let top = rect.top - cardHeight - 12;
  if (left < 10) left = 10;
  if (left + cardWidth > window.innerWidth - 10) left = window.innerWidth - cardWidth - 10;
  if (top < 10) top = rect.bottom + 12;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function locationKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function groupListingsByLocation(listings: MapListing[]): Map<string, MapListing[]> {
  const grouped = new Map<string, MapListing[]>();
  listings.forEach((listing) => {
    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = locationKey(lat, lng);
    const bucket = grouped.get(key) ?? [];
    bucket.push(listing);
    grouped.set(key, bucket);
  });
  return grouped;
}

function formatPinLabel(locationListings: MapListing[]): string {
  const prices = locationListings.map((listing) => listing.price_per_season ?? 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const priceLabel = `${Math.max(lowestPrice, 0).toLocaleString("sv-SE")} kr`;
  if (locationListings.length === 1) {
    return priceLabel;
  }
  return `${locationListings.length} platser · från ${priceLabel}`;
}

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
  highlightedListingId = null,
  onListingMarkerClick,
  className = "",
  borderless = false,
}: BerthMapProps) {
  const supabase = useMemo(() => createClient(), []);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<MarkerOverlay[]>([]);
  const activeInfoWindowRef = useRef<any>(null);
  const mapPreviewCleanupRef = useRef<(() => void) | null>(null);
  const suppressMapPreviewCloseRef = useRef(false);
  const onListingMarkerClickRef = useRef(onListingMarkerClick);
  const highlightedListingIdRef = useRef(highlightedListingId);

  useEffect(() => {
    onListingMarkerClickRef.current = onListingMarkerClick;
  }, [onListingMarkerClick]);

  useEffect(() => {
    highlightedListingIdRef.current = highlightedListingId;
    markersRef.current.forEach((marker) => {
      marker.setHighlighted(highlightedListingId);
    });
  }, [highlightedListingId]);
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

    const closeMapPreview = () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      if (mapPreviewCleanupRef.current) {
        mapPreviewCleanupRef.current();
        mapPreviewCleanupRef.current = null;
      }
      document.querySelectorAll(".map-preview-card").forEach((el) => el.remove());
    };

    const drawMarkers = async () => {
      if (!mounted) return;

      closeMapPreview();
      const bounds = new googleMaps.LatLngBounds();
      class PriceMarker extends googleMaps.OverlayView {
        position: any;
        containerDiv: HTMLDivElement;
        listingsAtLocation: MapListing[];
        currentIndex: number;
        listingIds: Array<string | number>;
        mapInstance: any;

        constructor(position: any, listingsAtLocation: MapListing[], mapInstance: any) {
          super();
          this.position = position;
          this.listingsAtLocation = listingsAtLocation;
          this.listingIds = listingsAtLocation.map((listing) => listing.id);
          this.currentIndex = 0;
          this.mapInstance = mapInstance;
          this.containerDiv = document.createElement("div");
          this.containerDiv.className = "price-marker";
          const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
          const pinLabel = formatPinLabel(listingsAtLocation);
          this.containerDiv.innerHTML = `
            <div style="
              background: white;
              padding: ${isMobile ? "5px 10px" : "6px 12px"};
              border-radius: 20px;
              font-weight: 700;
              font-size: ${isMobile ? "11px" : "13px"};
              color: #0a1628;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              white-space: nowrap;
              cursor: pointer;
              transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
              border: 1px solid rgba(15,31,61,0.08);
            " class="price-label">
              ${escapeHtml(pinLabel)}
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
            this.applyHighlight(highlightedListingIdRef.current);
          });
          this.containerDiv.addEventListener("click", (event) => {
            event.stopPropagation();
            suppressMapPreviewCloseRef.current = true;
            this.openInfoWindow();
            window.setTimeout(() => {
              suppressMapPreviewCloseRef.current = false;
            }, 0);
          });
          this.applyHighlight(highlightedListingIdRef.current);
        }

        buildSingleListingContent(listing: MapListing): string {
          return buildSingleListingPreviewHtml(listing);
        }

        buildMultipleListingsContent(locationListings: MapListing[]): string {
          return buildGroupedListingsPreviewHtml(locationListings);
        }

        openInfoWindow() {
          closeMapPreview();

          const isSingle = this.listingsAtLocation.length === 1;
          const listing = this.listingsAtLocation[0];
          const card = document.createElement("div");
          card.className = "map-preview-card";
          card.style.cssText = "position:fixed;z-index:10000;";
          card.innerHTML = isSingle
            ? this.buildSingleListingContent(listing)
            : this.buildMultipleListingsContent(this.listingsAtLocation);

          document.body.appendChild(card);
          positionMapPreviewCard(card, this.containerDiv);

          const reposition = () => positionMapPreviewCard(card, this.containerDiv);
          const mapClickListener = googleMaps.event.addListener(map, "click", () => {
            if (suppressMapPreviewCloseRef.current) return;
            closeMapPreview();
          });
          const idleListener = googleMaps.event.addListener(map, "idle", reposition);
          mapPreviewCleanupRef.current = () => {
            googleMaps.event.removeListener(mapClickListener);
            googleMaps.event.removeListener(idleListener);
          };

          card.querySelector("[data-close]")?.addEventListener("click", (event) => {
            event.stopPropagation();
            closeMapPreview();
          });

          if (isSingle && listing) {
            card.addEventListener("click", (event) => {
              if ((event.target as HTMLElement).closest("[data-close]")) return;
              window.location.href = `/listings/${listing.id}`;
            });
            onListingMarkerClickRef.current?.(listing.id);
          } else if (this.listingsAtLocation[0]) {
            onListingMarkerClickRef.current?.(this.listingsAtLocation[0].id);
          }

          card.querySelectorAll("[data-listing-row]").forEach((row) => {
            row.addEventListener("click", (event) => {
              event.stopPropagation();
            });
          });
        }

        applyHighlight(highlightedListingId: string | number | null) {
          const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
          if (!label) return;
          const isHighlighted =
            highlightedListingId != null &&
            this.listingIds.some((id) => String(id) === String(highlightedListingId));
          if (isHighlighted) {
            label.style.background = "#0d9488";
            label.style.color = "#ffffff";
            label.style.borderColor = "#0d9488";
          } else {
            label.style.background = "#ffffff";
            label.style.color = "#0a1628";
            label.style.borderColor = "rgba(15,31,61,0.08)";
          }
        }

        setHighlighted(highlightedListingId: string | number | null) {
          this.applyHighlight(highlightedListingId);
        }

        formatDate(dateValue: string | null | undefined) {
          if (!dateValue) return "-";
          const parsed = new Date(dateValue);
          if (Number.isNaN(parsed.getTime())) return "-";
          return parsed.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
        }

        showPreviewCard() {
          this.openInfoWindow();
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
      const listingsByLocation = groupListingsByLocation(listings);

      listingsByLocation.forEach((locationListings, coords) => {
        locationListings.forEach((listing) => {
          console.log("Listing data:", listing);
        });
        const [lat, lng] = coords.split(",").map(Number);
        const position = new googleMaps.LatLng(lat, lng);
        const marker = new PriceMarker(position, locationListings, map);
        marker.setMap(map);
        bounds.extend({ lat, lng });
        markersRef.current.push(marker as unknown as MarkerOverlay);
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
      closeMapPreview();
    };
  }, [listings, shouldFitBounds, center, radiusKm, defaultZoom, groupByHarbour, mapReady, highlightedListingId]);

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

  const wrapperClass = borderless
    ? `h-full w-full ${className}`
    : `rounded-[12px] border border-[#dce3ee] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${className}`;

  return (
    <div className={wrapperClass}>
      <div
        ref={mapElementRef}
        style={{ height, width: "100%", borderRadius: borderless ? "0" : "12px" }}
      />
    </div>
  );
}
