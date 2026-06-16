"use client";

import { useEffect, useRef } from "react";

import { getAreaLabel, isCityFromGoogleTypes, type AreaTag, type GeoJsonGeometry } from "@/lib/area-search";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export type { AreaTag };

type AreaTagInputProps = {
  selectedAreas: AreaTag[];
  onAddTag: (tag: AreaTag) => void;
  onUpdateTagPolygon: (tagId: string, polygon: GeoJsonGeometry) => void;
  onRemoveTag: (tagId: string) => void;
  onEnter?: () => void;
  className?: string;
};

function googleBoundsToViewport(bounds: {
  getNorthEast: () => { lat: () => number; lng: () => number };
  getSouthWest: () => { lat: () => number; lng: () => number };
}): AreaTag["viewport"] {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return {
    northeast: { lat: ne.lat(), lng: ne.lng() },
    southwest: { lat: sw.lat(), lng: sw.lng() },
  };
}

export default function AreaTagInput({
  selectedAreas,
  onAddTag,
  onUpdateTagPolygon,
  onRemoveTag,
  onEnter,
  className = "",
}: AreaTagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const selectedAreasRef = useRef(selectedAreas);
  const onAddTagRef = useRef(onAddTag);
  const onUpdateTagPolygonRef = useRef(onUpdateTagPolygon);
  const onEnterRef = useRef(onEnter);

  useEffect(() => {
    selectedAreasRef.current = selectedAreas;
  }, [selectedAreas]);

  useEffect(() => {
    onAddTagRef.current = onAddTag;
    onUpdateTagPolygonRef.current = onUpdateTagPolygon;
    onEnterRef.current = onEnter;
  }, [onAddTag, onUpdateTagPolygon, onEnter]);

  useEffect(() => {
    let cancelled = false;
    let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

    void loadGoogleMaps()
      .then(() => {
        if (cancelled || initializedRef.current) return;

        const input = inputRef.current;
        if (!input || !window.google?.maps?.places?.Autocomplete) return;

        const googleMaps = window.google.maps;

        const clearInput = () => {
          if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
          }
        };

        const autocomplete = new googleMaps.places.Autocomplete(input, {
          componentRestrictions: { country: "se" },
          fields: ["name", "place_id", "geometry", "types"],
          types: [],
        });

        autocomplete.addListener("place_changed", () => {
          window.setTimeout(async () => {
            const place = autocomplete.getPlace();
            if (!place?.geometry?.location) return;

            const name = place.name?.trim();
            if (!name) return;

            const types = place.types ?? [];
            const isCity = isCityFromGoogleTypes(types);

            if (
              selectedAreasRef.current.some(
                (tag) => tag.name.toLowerCase() === name.toLowerCase(),
              )
            ) {
              clearInput();
              return;
            }

            const location = place.geometry.location;
            const viewportBounds = place.geometry.viewport ?? place.geometry.bounds;
            const tag: AreaTag = {
              id: Date.now().toString(),
              name,
              types,
              label: getAreaLabel(types),
              isCity,
              lat: location.lat(),
              lng: location.lng(),
              viewport: viewportBounds ? googleBoundsToViewport(viewportBounds) : null,
              polygon: null,
            };

            onAddTagRef.current(tag);
            clearInput();

            try {
              const response = await fetch(`/api/area-polygon?name=${encodeURIComponent(name)}`);
              const data = (await response.json()) as { geojson?: GeoJsonGeometry | null };
              console.log("Polygon API response for", name, ":", data);
              console.log("Has geojson:", Boolean(data?.geojson));
              console.log("GeoJSON type:", data?.geojson?.type);
              if (
                data.geojson &&
                (data.geojson.type === "Polygon" || data.geojson.type === "MultiPolygon")
              ) {
                onUpdateTagPolygonRef.current(tag.id, data.geojson);
              }
            } catch (error) {
              console.warn("Could not fetch polygon for", name, error);
            }
          }, 0);
        });

        keydownHandler = (event: KeyboardEvent) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          onEnterRef.current?.();
        };

        input.addEventListener("keydown", keydownHandler);
        autocompleteRef.current = autocomplete;
        initializedRef.current = true;
      })
      .catch((error) => {
        console.error("Failed to load Google Maps for area autocomplete:", error);
      });

    return () => {
      cancelled = true;
      const input = inputRef.current;
      if (input && keydownHandler) {
        input.removeEventListener("keydown", keydownHandler);
      }
      if (autocompleteRef.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      initializedRef.current = false;
    };
  }, []);

  return (
    <div
      className={`search-field group flex w-full flex-1 cursor-text flex-col rounded-[2rem] px-4 py-3 transition-colors hover:bg-[#f5f0e8] md:min-w-[140px] md:px-5 md:py-2.5 ${className}`}
    >
      <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">Område</span>
      <div className="relative mt-1 flex min-h-[44px] flex-wrap items-center gap-1.5 md:min-h-[32px]">
        {selectedAreas.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#0d9488]/30 bg-[rgba(13,148,136,0.08)] px-2.5 py-1 text-sm text-[#0a1628]"
          >
            <span className="truncate">
              {tag.name} · {tag.label ?? getAreaLabel(tag.types)}
            </span>
            <button
              type="button"
              onClick={() => onRemoveTag(tag.id)}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#0d9488] transition hover:bg-[#0d9488]/15"
              aria-label={`Ta bort ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          placeholder={selectedAreas.length === 0 ? "Stadsdel eller ort" : "Lägg till område"}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-base text-[#4a5568] outline-none placeholder:text-[#8a96a8] md:text-sm"
          autoComplete="off"
        />
      </div>
      <style jsx global>{`
        .pac-container {
          z-index: 10050 !important;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 31, 61, 0.16);
          margin-top: 4px;
          font-family: inherit;
        }
        .pac-item {
          padding: 12px 16px;
          color: #0a1628;
          cursor: pointer;
          border-top: 1px solid #f1f5f9;
        }
        .pac-item:first-child {
          border-top: none;
        }
        .pac-item:hover,
        .pac-item-selected {
          background: #f0fdfa !important;
          color: #0a1628 !important;
        }
        .pac-item-query {
          color: #0a1628;
          font-size: 14px;
          font-weight: 600;
        }
        .pac-matched {
          color: #0d9488;
          font-weight: 600;
        }
        .pac-icon {
          display: none;
        }
      `}</style>
    </div>
  );
}
