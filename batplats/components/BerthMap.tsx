"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { extendBoundsFromAreaBounds, extendBoundsFromGeoJson, simplifyGeoJsonGeometry, type AreaPolygonOverlay, type AreaTag, type GeoJsonGeometry } from "@/lib/area-search";

type MarkerOverlay = {
  setMap: (map: unknown) => void;
  map?: unknown;
  listingIds: Array<string | number>;
  setHighlighted: (highlightedListingId: string | number | null) => void;
  setHovered: (hoveredListingId: string | number | null) => void;
  updateAreaStyles: () => void;
};

type BerthMapProps = {
  height?: string;
  listings?: MapListing[];
  filteredListings?: MapListing[];
  shouldFitBounds?: boolean;
  center?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  areaPolygons?: AreaPolygonOverlay[];
  areaTags?: AreaTag[];
  defaultZoom?: number;
  groupByHarbour?: boolean;
  hoveredListingId?: string | number | null;
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

function isDrawableAreaGeometry(geometry: GeoJsonGeometry | null | undefined): geometry is GeoJsonGeometry {
  return Boolean(geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon"));
}

function addTagPolygonToMapData(
  dataLayer: { addGeoJson: (geoJson: object) => void },
  geometry: GeoJsonGeometry,
  properties: Record<string, unknown>,
) {
  if (!isDrawableAreaGeometry(geometry)) {
    console.warn("Skipping non-area geometry for map polygon");
    return;
  }

  const simplifiedGeometry = simplifyGeoJsonGeometry(geometry);

  if (simplifiedGeometry.type === "MultiPolygon") {
    for (const polygonCoords of simplifiedGeometry.coordinates) {
      if (!Array.isArray(polygonCoords)) continue;
      dataLayer.addGeoJson({
        type: "Feature",
        properties,
        geometry: { type: "Polygon", coordinates: polygonCoords },
      });
    }
    return;
  }

  dataLayer.addGeoJson({
    type: "Feature",
    properties,
    geometry: simplifiedGeometry,
  });
}

function formatBoatDimensions(listing: MapListing): string {
  const parts: string[] = [];
  if (listing.max_boat_length != null) parts.push(`Max ${listing.max_boat_length} m längd`);
  if (listing.max_boat_width != null) parts.push(`${listing.max_boat_width} m bredd`);
  if (parts.length === 0) return "Max mått ej angivna";
  return parts.join(" · ");
}

function buildSingleListingPreviewHtml(listing: MapListing, options?: { outsideArea?: boolean }): string {
  const harbourLabel = `${listing.harbour_name ?? "Hamn"} · ${listing.city ?? "Okänd stad"}`;
  const priceLabel = `${(listing.price_per_season ?? 0).toLocaleString("sv-SE")} SEK` + " / säsong";
  const outsideNote = options?.outsideArea
    ? '<div style="font-size:12px;color:#94a3b8;margin-top:8px;font-style:italic;">Denna plats ligger utanför ditt valda område</div>'
    : "";
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
    outsideNote,
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
  filteredListings,
  shouldFitBounds = false,
  center = null,
  radiusKm = null,
  areaPolygons = [],
  areaTags = [],
  defaultZoom = 11,
  groupByHarbour = false,
  hoveredListingId = null,
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
  const markersByListingIdRef = useRef<Map<string, MarkerOverlay>>(new Map());
  const activeInfoWindowRef = useRef<any>(null);
  const mapPreviewCleanupRef = useRef<(() => void) | null>(null);
  const suppressMapPreviewCloseRef = useRef(false);
  const onListingMarkerClickRef = useRef(onListingMarkerClick);
  const highlightedListingIdRef = useRef(highlightedListingId);
  const hoveredListingIdRef = useRef(hoveredListingId);
  const filteredListingIdsRef = useRef<Set<string>>(new Set());
  const areaFilterActiveRef = useRef(false);

  useEffect(() => {
    areaFilterActiveRef.current = filteredListings != null;
    filteredListingIdsRef.current = new Set(
      (filteredListings ?? []).map((listing) => String(listing.id)),
    );
    markersRef.current.forEach((marker) => {
      marker.updateAreaStyles();
    });
  }, [filteredListings]);

  useEffect(() => {
    onListingMarkerClickRef.current = onListingMarkerClick;
  }, [onListingMarkerClick]);

  useEffect(() => {
    highlightedListingIdRef.current = highlightedListingId;
    markersRef.current.forEach((marker) => {
      marker.setHighlighted(highlightedListingId);
    });
  }, [highlightedListingId]);

  useEffect(() => {
    hoveredListingIdRef.current = hoveredListingId;
    markersRef.current.forEach((marker) => {
      marker.setHovered(hoveredListingId);
    });
  }, [hoveredListingId]);

  const radiusCircleRef = useRef<any>(null);
  const areaTagMarkersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [internalListings, setInternalListings] = useState<MapListing[]>([]);
  const [hydratedProvidedListings, setHydratedProvidedListings] = useState<MapListing[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const listings = providedListings ? hydratedProvidedListings : internalListings;

  useEffect(() => {
    if (!hoveredListingId || !mapRef.current || !mapReady) return;

    const listing = listings.find((item) => String(item.id) === String(hoveredListingId));
    if (listing?.lat == null || listing?.lng == null) return;

    mapRef.current.panTo({ lat: Number(listing.lat), lng: Number(listing.lng) });
  }, [hoveredListingId, listings, mapReady]);

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

    void loadGoogleMaps()
      .then(() => {
        initMap();
      })
      .catch((error) => {
        console.error("Failed to load Google Maps for BerthMap:", error);
      });
  }, [apiKey, defaultZoom]);

  const drawAllPolygons = useCallback(() => {
    if (!mapReady || !mapRef.current || !window.google) return;

    const map = mapRef.current;
    const googleMaps = window.google.maps;

    console.log(
      "Drawing polygons for tags:",
      areaTags.map((tag) => ({ name: tag.name, hasPolygon: Boolean(tag.polygon) })),
    );

    map.data.forEach((feature: { getGeometry: () => unknown }) => map.data.remove(feature));

    areaTagMarkersRef.current.forEach((marker) => marker.setMap(null));
    areaTagMarkersRef.current = [];

    const bounds = new googleMaps.LatLngBounds();
    let hasBounds = false;

    if (areaTags.length > 0) {
      for (const tag of areaTags) {
        console.log("Tag isCity value:", tag.isCity, typeof tag.isCity);
        if (tag.polygon && isDrawableAreaGeometry(tag.polygon)) {
          addTagPolygonToMapData(map.data, tag.polygon, { isCity: tag.isCity === true });
          extendBoundsFromGeoJson(bounds, tag.polygon);
          hasBounds = true;
        } else if (tag.viewport) {
          extendBoundsFromAreaBounds(bounds, tag.viewport);
          hasBounds = true;
        } else if (tag.lat != null && tag.lng != null) {
          bounds.extend({ lat: tag.lat, lng: tag.lng });
          hasBounds = true;
        }

        if (tag.isCity) continue;

        if (!tag.polygon && tag.lat != null && tag.lng != null) {
          const marker = new googleMaps.Marker({
            position: { lat: tag.lat, lng: tag.lng },
            map,
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#0d9488",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
          areaTagMarkersRef.current.push(marker);
        }
      }

      map.data.setStyle((feature: { getProperty: (key: string) => unknown }) => {
        const isCity = feature.getProperty("isCity") === true;
        return {
          fillColor: "#0d9488",
          fillOpacity: isCity ? 0.12 : 0.05,
          strokeColor: "#0d9488",
          strokeWeight: isCity ? 1.5 : 2.5,
          strokeOpacity: 0.85,
          zIndex: 1,
        };
      });

      if (hasBounds) {
        map.fitBounds(bounds);
        googleMaps.event.addListenerOnce(map, "bounds_changed", () => {
          if (map.getZoom() > 14) map.setZoom(14);
        });
      }
      return;
    }

    areaPolygons.forEach((overlay) => {
      const shouldDraw = overlay.drawPolygon === true && Boolean(overlay.geojson);
      const featureProperties = {
        name: overlay.name ?? "",
        isCity: overlay.isMunicipality === true,
      };

      if (shouldDraw && isDrawableAreaGeometry(overlay.geojson as GeoJsonGeometry)) {
        addTagPolygonToMapData(map.data, overlay.geojson as GeoJsonGeometry, featureProperties);
      }

      if (overlay.bounds) {
        extendBoundsFromAreaBounds(bounds, overlay.bounds);
        hasBounds = true;
        return;
      }

      if (overlay.geojson && isDrawableAreaGeometry(overlay.geojson)) {
        extendBoundsFromGeoJson(bounds, overlay.geojson);
        hasBounds = true;
        return;
      }

      if (!overlay.paths?.length) return;
      const ring = overlay.paths.map((point) => [point.lng, point.lat]);
      ring.push(ring[0]);
      const geometry = simplifyGeoJsonGeometry({
        type: "Polygon",
        coordinates: [ring],
      });
      if (shouldDraw) {
        addTagPolygonToMapData(map.data, geometry, featureProperties);
      }
      overlay.paths.forEach((point) => {
        bounds.extend(point);
        hasBounds = true;
      });
    });

    map.data.setStyle((feature: { getProperty: (key: string) => unknown }) => {
      const isCity = feature.getProperty("isCity") === true;
      return {
        fillColor: "#0d9488",
        fillOpacity: isCity ? 0.12 : 0.05,
        strokeColor: "#0d9488",
        strokeWeight: isCity ? 1.5 : 2.5,
        strokeOpacity: 0.85,
        zIndex: 1,
      };
    });

    if (hasBounds && markersRef.current.length === 0) {
      map.fitBounds(bounds);
      googleMaps.event.addListenerOnce(map, "bounds_changed", () => {
        if (map.getZoom() > 14) map.setZoom(14);
      });
    }
  }, [areaTags, areaPolygons, mapReady]);

  useEffect(() => {
    drawAllPolygons();
  }, [drawAllPolygons, areaTags]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google) {
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
    markersByListingIdRef.current.clear();

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
        isInsideArea: boolean;

        constructor(position: any, listingsAtLocation: MapListing[], mapInstance: any, isInsideArea: boolean) {
          super();
          this.position = position;
          this.listingsAtLocation = listingsAtLocation;
          this.listingIds = listingsAtLocation.map((listing) => listing.id);
          this.currentIndex = 0;
          this.mapInstance = mapInstance;
          this.isInsideArea = isInsideArea;
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
              transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
              border: 1px solid rgba(15,31,61,0.08);
            " class="price-label">
              ${escapeHtml(pinLabel)}
            </div>
          `;
          this.containerDiv.addEventListener("mouseenter", () => {
            const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
            if (!label) return;
            if (this.isInsideArea || !areaFilterActiveRef.current) {
              label.style.transform = "scale(1.08)";
            }
            label.style.zIndex = "1000";
          });
          this.containerDiv.addEventListener("mouseleave", () => {
            const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
            if (!label) return;
            this.applyAreaStyle();
            this.applyHighlight(highlightedListingIdRef.current);
            this.applyHover(hoveredListingIdRef.current);
          });
          this.containerDiv.addEventListener("click", (event) => {
            event.stopPropagation();
            suppressMapPreviewCloseRef.current = true;
            this.openInfoWindow();
            window.setTimeout(() => {
              suppressMapPreviewCloseRef.current = false;
            }, 0);
          });
          this.applyAreaStyle();
          this.applyHighlight(highlightedListingIdRef.current);
          this.applyHover(hoveredListingIdRef.current);
        }

        isListingInsideArea(listingId: string | number): boolean {
          if (!areaFilterActiveRef.current) return true;
          return filteredListingIdsRef.current.has(String(listingId));
        }

        recalculateInsideArea() {
          this.isInsideArea =
            !areaFilterActiveRef.current ||
            this.listingIds.some((listingId) => filteredListingIdsRef.current.has(String(listingId)));
        }

        applyAreaStyle() {
          const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
          if (!label) return;

          if (!areaFilterActiveRef.current) {
            label.style.background = "#0d9488";
            label.style.color = "#ffffff";
            label.style.borderColor = "#0d9488";
            label.style.opacity = "1";
            label.style.transform = "scale(1)";
            this.containerDiv.style.zIndex = "2";
            return;
          }

          if (this.isInsideArea) {
            label.style.background = "#0d9488";
            label.style.color = "#ffffff";
            label.style.borderColor = "#0d9488";
            label.style.opacity = "1";
            label.style.transform = "scale(1)";
            this.containerDiv.style.zIndex = "2";
            return;
          }

          label.style.background = "#94a3b8";
          label.style.color = "#ffffff";
          label.style.borderColor = "#94a3b8";
          label.style.opacity = "0.5";
          label.style.transform = "scale(0.95)";
          this.containerDiv.style.zIndex = "1";
        }

        buildSingleListingContent(listing: MapListing): string {
          return buildSingleListingPreviewHtml(listing, {
            outsideArea: areaFilterActiveRef.current && !this.isListingInsideArea(listing.id),
          });
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
            label.style.opacity = "1";
            label.style.transform = "scale(1.4)";
            this.containerDiv.style.zIndex = "10";
            return;
          }
          this.applyHover(hoveredListingIdRef.current);
        }

        applyHover(hoveredListingId: string | number | null) {
          const label = this.containerDiv.querySelector(".price-label") as HTMLElement | null;
          if (!label) return;

          const isHovered =
            hoveredListingId != null &&
            this.listingIds.some((id) => String(id) === String(hoveredListingId));

          if (isHovered) {
            label.style.background = "#0d9488";
            label.style.color = "#ffffff";
            label.style.borderColor = "#0d9488";
            label.style.opacity = "1";
            label.style.transform = "scale(1.4)";
            this.containerDiv.style.zIndex = "10";
            return;
          }

          this.applyAreaStyle();
        }

        setHighlighted(highlightedListingId: string | number | null) {
          this.applyHighlight(highlightedListingId);
        }

        setHovered(hoveredListingId: string | number | null) {
          this.applyHover(hoveredListingId);
        }

        updateAreaStyles() {
          this.recalculateInsideArea();
          const highlighted =
            highlightedListingIdRef.current != null &&
            this.listingIds.some((id) => String(id) === String(highlightedListingIdRef.current));
          const hovered =
            hoveredListingIdRef.current != null &&
            this.listingIds.some((id) => String(id) === String(hoveredListingIdRef.current));

          if (highlighted) {
            this.applyHighlight(highlightedListingIdRef.current);
            return;
          }
          if (hovered) {
            this.applyHover(hoveredListingIdRef.current);
            return;
          }
          this.applyAreaStyle();
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
      const locationEntries = [...listingsByLocation.entries()].sort(([, aListings], [, bListings]) => {
        const aInside =
          !areaFilterActiveRef.current ||
          aListings.some((listing) => filteredListingIdsRef.current.has(String(listing.id)));
        const bInside =
          !areaFilterActiveRef.current ||
          bListings.some((listing) => filteredListingIdsRef.current.has(String(listing.id)));
        return Number(aInside) - Number(bInside);
      });

      locationEntries.forEach(([coords, locationListings]) => {
        const [lat, lng] = coords.split(",").map(Number);
        const isInsideArea =
          !areaFilterActiveRef.current ||
          locationListings.some((listing) => filteredListingIdsRef.current.has(String(listing.id)));
        const position = new googleMaps.LatLng(lat, lng);
        const marker = new PriceMarker(position, locationListings, map, isInsideArea);
        marker.setMap(map);
        locationListings.forEach((listing) => {
          markersByListingIdRef.current.set(String(listing.id), marker as unknown as MarkerOverlay);
        });
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

      if (areaTags.length > 0) {
        areaTags.forEach((tag) => {
          if (tag.viewport) {
            extendBoundsFromAreaBounds(bounds, tag.viewport);
            return;
          }
          if (tag.polygon && isDrawableAreaGeometry(tag.polygon)) {
            extendBoundsFromGeoJson(bounds, tag.polygon);
            return;
          }
          if (tag.lat != null && tag.lng != null) {
            bounds.extend({ lat: tag.lat, lng: tag.lng });
          }
        });
      } else {
        areaPolygons.forEach((overlay) => {
          if (overlay.bounds) {
            extendBoundsFromAreaBounds(bounds, overlay.bounds);
            return;
          }
          if (overlay.geojson) {
            extendBoundsFromGeoJson(bounds, overlay.geojson);
            return;
          }
          overlay.paths?.forEach((point) => bounds.extend(point));
        });
      }

      if (markersRef.current.length > 0 || areaTags.length > 0 || areaPolygons.length > 0) {
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
      } else if (areaTags.length === 0 && areaPolygons.length === 0) {
        map.setCenter(center ?? STOCKHOLM_CENTER);
        map.setZoom(radiusKm ? 12 : defaultZoom);
      }
    };

    void drawMarkers();
    return () => {
      mounted = false;
      closeMapPreview();
    };
  }, [listings, filteredListings, hoveredListingId, shouldFitBounds, center, radiusKm, areaPolygons, areaTags, defaultZoom, groupByHarbour, mapReady, highlightedListingId]);

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
