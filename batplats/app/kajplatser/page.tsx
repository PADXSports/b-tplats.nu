"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import AuthNavbar from "@/components/auth-navbar";
import BerthMap, { type MapListing } from "@/components/BerthMap";
import Footer from "@/components/footer";
import ListingSearchBar from "@/components/ListingSearchBar";
import {
  areaTagsToParam,
  formatAreaNamesList,
  formatAreaResultCount,
  getProximityFallbackTagIds,
  listingMatchesAreaTags,
  parseAreaTagsParam,
  type AreaTag,
  type GeoJsonGeometry,
} from "@/lib/area-search";
import SortSelect from "@/components/SortSelect";
import { getListingImageSrc } from "@/lib/listing-image";
import RentalTypeBadge from "@/components/RentalTypeBadge";
import { BOOKED_BOOKING_STATUSES } from "@/lib/booking-status";
import { hasValidDateRange } from "@/lib/date-range";
import {
  isSeasonalListing,
  isShortTermListing,
  listingMatchesSeasonYear,
  listingMatchesShortTermDateSearch,
  type RentalPeriodMode,
} from "@/lib/rental-type";
import { createClient } from "@/lib/supabase/client";

type KajplatsListing = {
  id: number | string;
  harbour_id?: number | string | null;
  title: string;
  description: string | null;
  price_per_season: number | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  max_boat_depth: number | null;
  season_start: string | null;
  season_end: string | null;
  rental_type?: string | null;
  city: string | null;
  harbour_name: string | null;
  address: string | null;
  area: string | null;
  zip_code: string | null;
  image_url?: string | null;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  listing_images: ListingImage[];
  distance_km?: number | null;
  user_distance_km?: number | null;
  user_drive_text?: string | null;
  average_rating?: number | null;
  review_count?: number;
  listing_type?: string | null;
};

type ListingImage = {
  id: number | string;
  image_url: string;
  display_order: number;
};

type ListingRow = {
  id: number | string;
  harbour_id?: number | string | null;
  owner_id: string | null;
  title: string;
  description: string | null;
  price_per_season: number | null;
  max_boat_length: number | null;
  max_boat_width: number | null;
  max_boat_depth: number | null;
  season_start: string | null;
  season_end: string | null;
  rental_type?: string | null;
  city: string | null;
  harbour_name: string | null;
  image_url?: string | null;
  listing_type?: string | null;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  listing_images?:
    | Array<{
        id: number | string;
        image_url: string;
        display_order: number;
      }>
    | null;
  harbours:
    | {
        name: string | null;
        city: string | null;
        address: string | null;
        area: string | null;
        zip_code: string | null;
        lat: number | null;
        lng: number | null;
      }
    | Array<{
        name: string | null;
        city: string | null;
        address: string | null;
        area: string | null;
        zip_code: string | null;
        lat: number | null;
        lng: number | null;
        owner_id?: string | null;
      }>
    | null;
};

type HarbourSuggestionRow = {
  id: number | string;
  name: string | null;
  city: string | null;
  zip_code: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  owner_id?: string | null;
};

type LocationSuggestionType = "harbour" | "city" | "area" | "zip";

type LocationSuggestion = {
  key: string;
  type: LocationSuggestionType;
  label: string;
  secondary: string | null;
  value: string;
  harbourId: number | string | null;
  lat: number | null;
  lng: number | null;
};

const LOCATION_TYPE_LABELS: Record<LocationSuggestionType, string> = {
  harbour: "Hamnar",
  city: "Städer",
  area: "Områden",
  zip: "Postnummer",
};

const isZipSearchValue = (value: string) => /^\d[\d\s]*$/.test(value.trim());

const includesMatch = (value: string | null | undefined, query: string) =>
  Boolean(value && value.toLowerCase().trim().includes(query));

const includesZipMatch = (value: string | null | undefined, query: string) => {
  if (!value) return false;
  const normalizedQuery = normalizeZipValue(query);
  if (!normalizedQuery) return false;
  return normalizeZipValue(value).startsWith(normalizedQuery);
};

const formatLocationSuggestion = (
  type: LocationSuggestionType,
  row: HarbourSuggestionRow,
): LocationSuggestion | null => {
  const city = row.city?.trim() || "Okänd stad";
  const area = row.area?.trim() || null;
  const name = row.name?.trim() || null;
  const zip = row.zip_code?.trim() || null;

  if (type === "harbour") {
    if (!name) return null;
    return {
      key: `${type}:${name}:${city}`,
      type,
      label: `⚓ ${name} • ${city}`,
      secondary: null,
      value: name,
      harbourId: row.id,
      lat: row.lat,
      lng: row.lng,
    };
  }

  if (type === "city") {
    return {
      key: `${type}:${city}`,
      type,
      label: city,
      secondary: area ? `Område: ${area}` : null,
      value: city,
      harbourId: null,
      lat: row.lat,
      lng: row.lng,
    };
  }

  if (type === "area") {
    if (!area) return null;
    return {
      key: `${type}:${area}:${city}`,
      type,
      label: `${city}, ${area}`,
      secondary: null,
      value: area,
      harbourId: null,
      lat: row.lat,
      lng: row.lng,
    };
  }

  if (!zip) return null;
  return {
    key: `${type}:${zip}:${city}`,
    type,
    label: `Postnummer: ${zip} • ${city}`,
    secondary: null,
    value: zip,
    harbourId: null,
    lat: row.lat,
    lng: row.lng,
  };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedText = (text: string, query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;
  const pattern = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "ig");
  const segments = text.split(pattern);

  return segments.map((segment, idx) =>
    segment.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <span key={`${segment}-${idx}`} className="font-semibold text-[#0d9488]">
        {segment}
      </span>
    ) : (
      <span key={`${segment}-${idx}`}>{segment}</span>
    ),
  );
};

function ListingCard({
  listing,
  isHighlighted = false,
  onHoverListing,
}: {
  listing: KajplatsListing;
  isHighlighted?: boolean;
  onHoverListing?: (listingId: string | number | null) => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const images = listing.listing_images ?? [];
  const totalImages = images.length;
  const hasMultipleImages = totalImages > 1;
  const currentImage = images[currentImageIndex]?.image_url ?? listing.image_url ?? null;
  const harbourLabel =
    listing.listing_type === "private"
      ? `Privat plats · ${listing.city ?? "Okänd stad"}`
      : (listing.harbour_name ?? "Hamn");

  const handlePrevImage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (totalImages <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleNextImage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (totalImages <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % totalImages);
  };

  return (
    <Link
      id={`listing-card-${listing.id}`}
      href={`/listings/${listing.id}`}
      onMouseEnter={() => onHoverListing?.(listing.id)}
      onMouseLeave={() => onHoverListing?.(null)}
      className={`group block cursor-pointer overflow-hidden rounded-xl border bg-white transition-all duration-200 ease-in-out hover:-translate-y-0.5 ${
        isHighlighted
          ? "border-[#0d9488] shadow-[0_4px_20px_rgba(13,148,136,0.3)]"
          : "border-[#dce3ee] shadow-[0_1px_4px_rgba(15,31,61,0.08),0_1px_2px_rgba(15,31,61,0.05)]"
      }`}
    >
      <div
        className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#c5d0de] to-[#dce3ee]"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Image
          src={getListingImageSrc(currentImage)}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="absolute right-3 top-3 rounded-full p-2 transition hover:scale-110"
          aria-label="Spara plats"
        >
          <svg className="h-6 w-6 fill-transparent stroke-white hover:fill-white/20" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>

        {hasMultipleImages && isHovering ? (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-110 hover:bg-white"
              aria-label="Föregående bild"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-110 hover:bg-white"
              aria-label="Nästa bild"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : null}

        {hasMultipleImages ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((image, index) => (
              <button
                type="button"
                key={image.id}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`h-1.5 rounded-full transition ${
                  index === currentImageIndex ? "w-2 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
                aria-label={`Visa bild ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="p-5">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.4px] text-[#0d9488]">{harbourLabel}</p>
        {listing.average_rating != null ? (
          <div className="mt-1 flex items-center gap-1 text-sm">
            <svg className="h-4 w-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-medium text-gray-900">{listing.average_rating.toFixed(1)}</span>
            <span className="text-gray-500">({listing.review_count ?? 0})</span>
          </div>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-[#0f1f3d]">{listing.title}</h2>
          <RentalTypeBadge rentalType={listing.rental_type} />
        </div>
        <p className="mt-1 text-sm text-[#8a96a8]">{listing.city ?? "Okänd stad"}</p>
        {listing.user_distance_km != null ? (
          <div
            className="mt-1 flex items-center gap-1 whitespace-nowrap text-[14px] font-normal text-[#64748b]"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-[#0d9488]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>
              {listing.user_distance_km.toFixed(1)} km
              {listing.user_drive_text ? ` • ${listing.user_drive_text.replace(/\bmins?\b/gi, "min")} med bil` : ""}
            </span>
          </div>
        ) : null}
        <p className="mt-2 text-sm font-semibold text-[#0f1f3d]">
          {(listing.price_per_season ?? 0).toLocaleString("sv-SE")} SEK / säsong
        </p>
        <p className="mt-1 text-xs text-[#8a96a8]">
          Max: {listing.max_boat_length ?? "-"}m längd · {listing.max_boat_width ?? "-"}m bredd
        </p>
      </div>
    </Link>
  );
}

const normalizeValue = (value: string) => value.trim().toLowerCase();
const normalizeZipValue = (value: string) => value.replace(/\D/g, "");
const formatSwedishZip = (value: string) => {
  const digits = normalizeZipValue(value);
  if (digits.length < 4) return value.trim();
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)}`.trim();
};
const toDateOnlyValue = (value: string | null) => (value ? value.slice(0, 10) : null);
const toRadians = (value: number) => (value * Math.PI) / 180;
const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

function KajplatserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<KajplatsListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<AreaTag[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriodMode>("all");
  const [seasonYear, setSeasonYear] = useState("2026");
  const [lengthInput, setLengthInput] = useState("");
  const [widthInput, setWidthInput] = useState("");
  const [depthInput, setDepthInput] = useState("");
  const [dateError, setDateError] = useState("");
  const [hoveredListingId, setHoveredListingId] = useState<string | number | null>(null);
  const [focusedListingId, setFocusedListingId] = useState<string | number | null>(null);
  const [activeLocationQuery, setActiveLocationQuery] = useState("");
  const [isLocationSearchActive, setIsLocationSearchActive] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [rentalQuery, setRentalQuery] = useState<RentalPeriodMode>("all");
  const [seasonYearQuery, setSeasonYearQuery] = useState("2026");
  const [lengthQuery, setLengthQuery] = useState("");
  const [widthQuery, setWidthQuery] = useState("");
  const [depthQuery, setDepthQuery] = useState("");
  const [zipQuery, setZipQuery] = useState("");
  const [radiusInputKm, setRadiusInputKm] = useState(10);
  const [radiusKm, setRadiusKm] = useState(10);
  const [geocodedCenter, setGeocodedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [travelMap, setTravelMap] = useState<Record<string, { distanceText: string | null; driveText: string | null; km: number | null }>>({});
  const [sortBy, setSortBy] = useState<"default" | "nearest">("default");
  const [locationRequested, setLocationRequested] = useState(false);
  const selectedHarbourId = searchParams.get("harbour_id");
  const storageKey = "batplats.userLocation";
  const deniedKey = "batplats.userLocationDenied";

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const areaParam = searchParams.get("areas") ?? "";
    const cityParam = searchParams.get("city") ?? searchParams.get("location") ?? "";
    const locationParam = cityParam;
    const startParam = searchParams.get("start") ?? "";
    const endParam = searchParams.get("end") ?? "";
    const rentalParam = searchParams.get("rental") ?? "";
    const seasonParam = searchParams.get("season") ?? "2026";
    const resolvedRentalPeriod: RentalPeriodMode =
      rentalParam === "seasonal" || rentalParam === "short_term"
        ? rentalParam
        : startParam && endParam
          ? "short_term"
          : "all";
    const lengthParam = searchParams.get("length") ?? searchParams.get("boat_length") ?? "";
    const widthParam = searchParams.get("width") ?? searchParams.get("boat_width") ?? "";
    const depthParam = searchParams.get("depth") ?? searchParams.get("boat_depth") ?? "";
    const zipParam = searchParams.get("zip") ?? "";
    const shouldShowMap = searchParams.get("view") === "map";

    setCityQuery(locationParam);
    setStartQuery(startParam);
    setEndQuery(endParam);
    setRentalQuery(resolvedRentalPeriod);
    setSeasonYearQuery(seasonParam);
    setLengthQuery(lengthParam);
    setWidthQuery(widthParam);
    setDepthQuery(depthParam);
    setLocationInput(locationParam);
    setLocationQuery(locationParam);
    setStartDate(startParam);
    setEndDate(endParam);
    setRentalPeriod(resolvedRentalPeriod);
    setSeasonYear(seasonParam);
    setLengthInput(lengthParam);
    setWidthInput(widthParam);
    setDepthInput(depthParam);
    setActiveLocationQuery(locationParam);
    setIsLocationSearchActive(Boolean(locationParam.trim()));
    setSearchActive(
      Boolean(
        locationParam.trim() ||
          startParam ||
          endParam ||
          lengthParam ||
          widthParam ||
          depthParam ||
          areaParam ||
          resolvedRentalPeriod !== "all",
      ),
    );
    setZipQuery(zipParam);
    if (shouldShowMap) {
      setMobileMapOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const areasParam = searchParams.get("areas");
    const parsed = parseAreaTagsParam(areasParam);
    if (!parsed.length) {
      setSelectedAreas([]);
      return;
    }

    setSelectedAreas(parsed);
    setSearchActive(true);

    let cancelled = false;
    const hydratePolygons = async () => {
      const hydrated = await Promise.all(
        parsed.map(async (tag) => {
          try {
            const response = await fetch(`/api/area-polygon?name=${encodeURIComponent(tag.name)}`);
            const data = (await response.json()) as { geojson?: GeoJsonGeometry | null };
            if (
              data.geojson &&
              (data.geojson.type === "Polygon" || data.geojson.type === "MultiPolygon")
            ) {
              return { ...tag, polygon: data.geojson };
            }
          } catch {
            // Keep tag without polygon — viewport fallback still works
          }
          return tag;
        }),
      );
      if (!cancelled) setSelectedAreas(hydrated);
    };

    void hydratePolygons();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    const query = locationQuery.toLowerCase().trim();
    const zipQuery = normalizeZipValue(locationQuery);
    const formattedZipQuery = zipQuery.length >= 4 ? `${zipQuery.slice(0, 3)} ${zipQuery.slice(3)}` : zipQuery;
    const zipOrClause = zipQuery ? `,zip_code.ilike.%${formattedZipQuery}%` : "";
    if (!query) {
      setLocationSuggestions([]);
      setIsLocationLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLocationLoading(true);
      try {
        const { data, error: suggestionError } = await supabase
          .from("harbours")
          .select("id, name, city, zip_code, area, lat, lng, owner_id")
          .not("owner_id", "is", null)
          .or(`name.ilike.%${query}%,city.ilike.%${query}%,zip_code.ilike.%${query}%${zipOrClause},area.ilike.%${query}%`)
          .limit(8);

        if (suggestionError) {
          if (!cancelled) setLocationSuggestions([]);
          return;
        }

        const rows = ((data ?? []) as HarbourSuggestionRow[]).slice(0, 8);
        const suggestions: LocationSuggestion[] = [];
        const keys = new Set<string>();

        const addSuggestion = (type: LocationSuggestionType, row: HarbourSuggestionRow) => {
          const formatted = formatLocationSuggestion(type, row);
          if (!formatted || keys.has(formatted.key)) return;
          keys.add(formatted.key);
          suggestions.push(formatted);
        };

        for (const row of rows) {
          if (includesMatch(row.name, query)) addSuggestion("harbour", row);
          if (includesMatch(row.area, query)) addSuggestion("area", row);
          if (includesMatch(row.city, query)) addSuggestion("city", row);
          if (includesZipMatch(row.zip_code, locationQuery) || includesMatch(row.zip_code, query)) {
            addSuggestion("zip", row);
          }
        }

        if (!cancelled) {
          setLocationSuggestions(suggestions.slice(0, 8));
        }
      } catch {
        if (!cancelled) setLocationSuggestions([]);
      } finally {
        if (!cancelled) setIsLocationLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [locationQuery, supabase]);

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    console.log("🌍 Requesting geolocation permission...");
    setLocationRequested(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        console.log("✅ Location granted:", next);
        setUserLocation(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
        localStorage.removeItem(deniedKey);
      },
      (error) => {
        console.error("❌ Location denied:", error);
        localStorage.setItem(deniedKey, "1");
      },
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    console.log("🔍 Båtplatser page mounted");
    console.log("📍 Checking for cached location...");
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { lat: number; lng: number };
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          console.log("✅ Found cached location:", parsed);
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          setLocationRequested(true);
          return;
        }
      } catch {
        console.log("⚠️ Cached location malformed, requesting permission...");
        // Ignore malformed cache.
      }
    }
    if (localStorage.getItem(deniedKey) === "1") {
      console.log("❌ Previous location denial found in localStorage.");
      setLocationRequested(true);
      return;
    }
    console.log("❌ No cached location, requesting permission...");
    requestUserLocation();
  }, [requestUserLocation]);

  useEffect(() => {
    if (!userLocation || listings.length === 0) return;
    const targets = listings.filter((listing) => listing.lat != null && listing.lng != null);
    if (targets.length === 0) return;
    const missingTargets = targets.filter((listing) => !travelMap[String(listing.id)]);
    if (missingTargets.length === 0) return;

    const destinationParam = missingTargets.map((listing) => `${Number(listing.lat)},${Number(listing.lng)}`).join("|");
    const originParam = `${userLocation.lat},${userLocation.lng}`;
    const url =
      `/api/distance?origins=${encodeURIComponent(originParam)}&` +
      `destinations=${encodeURIComponent(destinationParam)}`;

    let cancelled = false;
    const loadTravel = async () => {
      try {
        missingTargets.forEach((listing) => {
          console.log(`📡 Fetching distance for listing ${listing.id}...`);
        });
        const response = await fetch(url);
        const payload = (await response.json()) as {
          rows?: Array<{ elements?: Array<{ status?: string; distance?: { text?: string; value?: number }; duration?: { text?: string } }> }>;
        };
        console.log("✅ Distance result:", payload);
        const elements = payload.rows?.[0]?.elements ?? [];
        if (cancelled) return;
        setTravelMap((current) => {
          const next = { ...current };
          missingTargets.forEach((listing, index) => {
            const element = elements[index];
            if (element?.status === "OK") {
              next[String(listing.id)] = {
                distanceText: element.distance?.text ?? null,
                driveText: element.duration?.text ?? null,
                km: element.distance?.value != null ? element.distance.value / 1000 : null,
              };
              console.log("💾 Saving distance to state:", {
                listingId: listing.id,
                distance: next[String(listing.id)],
              });
            } else {
              next[String(listing.id)] = { distanceText: null, driveText: null, km: null };
              console.log("💾 Saving empty distance to state:", { listingId: listing.id });
            }
          });
          return next;
        });
      } catch (fetchError) {
        console.error("Failed to load drive times:", fetchError);
      }
    };

    void loadTravel();
    return () => {
      cancelled = true;
    };
  }, [listings, travelMap, userLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setRadiusKm(radiusInputKm), 120);
    return () => clearTimeout(timer);
  }, [radiusInputKm]);

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      try {
        let listingQuery = supabase
          .from("listings")
          .select(
            "id, owner_id, title, description, price_per_season, max_boat_length, max_boat_width, max_boat_depth, season_start, season_end, rental_type, city, harbour_name, image_url, listing_type, is_available, lat, lng, created_at, harbour_id, harbours!inner(id, name, city, address, area, zip_code, lat, lng, owner_id), listing_images(id, image_url, display_order)",
          )
          .eq("is_available", true)
          .not("owner_id", "is", null)
          .not("harbours.owner_id", "is", null)
          .order("created_at", { ascending: false });

        const trimmedCity = cityQuery.trim();
        if (trimmedCity) {
          const pattern = `%${trimmedCity}%`;
          listingQuery = listingQuery.or(
            `city.ilike.${pattern},harbour_name.ilike.${pattern},harbours.area.ilike.${pattern}`,
          );
        }

        const parsedLength = Number(lengthQuery);
        if (lengthQuery.trim() !== "" && Number.isFinite(parsedLength)) {
          listingQuery = listingQuery.gte("max_boat_length", parsedLength);
        }

        const parsedWidth = Number(widthQuery);
        if (widthQuery.trim() !== "" && Number.isFinite(parsedWidth)) {
          listingQuery = listingQuery.gte("max_boat_width", parsedWidth);
        }

        const parsedDepth = Number(depthQuery);
        if (depthQuery.trim() !== "" && Number.isFinite(parsedDepth)) {
          listingQuery = listingQuery.gte("max_boat_depth", parsedDepth);
        }

        if (selectedHarbourId) {
          listingQuery = listingQuery.eq("harbour_id", selectedHarbourId);
        }

        const { data, error: listingsError } = await listingQuery;
        console.log("🗺️ Fetched listings:", data);
        const firstRaw = (data ?? [])[0] as ListingRow | undefined;
        const firstHarbour = firstRaw
          ? (Array.isArray(firstRaw.harbours) ? firstRaw.harbours[0] : firstRaw.harbours)
          : null;
        console.log("🏝️ First listing harbour:", firstHarbour);

        if (listingsError) {
          setError(listingsError.message);
          return;
        }

        const listingsWithCoords = ((data ?? []) as ListingRow[]).filter((listing) => {
          const harbour = Array.isArray(listing.harbours) ? (listing.harbours[0] ?? null) : listing.harbours;
          return harbour != null && typeof harbour.lat === "number" && typeof harbour.lng === "number";
        });
        console.log("✅ Listings with valid coordinates:", listingsWithCoords.length);
        console.log("Sample:", listingsWithCoords[0] ?? null);

        let listingsData = (data ?? []) as ListingRow[];

        if (rentalQuery === "seasonal") {
          listingsData = listingsData.filter((listing) => isSeasonalListing(listing));
          const parsedSeasonYear = Number(seasonYearQuery);
          if (Number.isFinite(parsedSeasonYear)) {
            listingsData = listingsData.filter((listing) =>
              listingMatchesSeasonYear(listing, parsedSeasonYear),
            );
          }
        } else if (rentalQuery === "short_term") {
          listingsData = listingsData.filter((listing) => isShortTermListing(listing));

          const hasShortTermDateFilter = Boolean(
            startQuery && endQuery && hasValidDateRange(startQuery, endQuery),
          );
          if (hasShortTermDateFilter && listingsData.length > 0) {
            const listingIds = listingsData.map((listing) => listing.id);
            const bookingsByListing = new Map<
              string,
              Array<{ start_date: string | null; end_date: string | null; status?: string | null }>
            >();

            const { data: bookedRows, error: bookingsError } = await supabase
              .from("bookings")
              .select("listing_id, start_date, end_date, status")
              .in("status", [...BOOKED_BOOKING_STATUSES])
              .in("listing_id", listingIds);

            if (bookingsError) {
              console.error("Failed to fetch bookings for short-term date filter:", bookingsError);
            } else {
              for (const row of bookedRows ?? []) {
                if (row.listing_id == null || row.listing_id === "") continue;
                const key = String(row.listing_id);
                const existing = bookingsByListing.get(key) ?? [];
                existing.push({
                  start_date: row.start_date,
                  end_date: row.end_date,
                  status: row.status,
                });
                bookingsByListing.set(key, existing);
              }
            }

            listingsData = listingsData.filter((listing) =>
              listingMatchesShortTermDateSearch(
                startQuery,
                endQuery,
                (bookingsByListing.get(String(listing.id)) ?? []).map((booking) => ({
                  listing_id: listing.id,
                  ...booking,
                })),
              ),
            );
          }
        }

        if (trimmedCity) {
          const cityNeedle = trimmedCity.toLowerCase();
          listingsData = listingsData.filter((row) => {
            const harbour = Array.isArray(row.harbours) ? (row.harbours[0] ?? null) : row.harbours;
            return [row.city, row.harbour_name, harbour?.city, harbour?.name, harbour?.area].some(
              (field) => field && field.toLowerCase().includes(cityNeedle),
            );
          });
        }
        const harbourIds = [
          ...new Set(
            listingsData
              .map((l) => l.harbour_id)
              .filter((id): id is string | number => id != null && id !== ""),
          ),
        ];
        const { data: reviewStats } =
          harbourIds.length > 0
            ? await supabase.from("reviews").select("harbour_id, rating").in("harbour_id", harbourIds)
            : { data: [] as Array<{ harbour_id: string | number; rating: number }> };

        const normalized = listingsData.map((row) => {
          const harbour = Array.isArray(row.harbours) ? (row.harbours[0] ?? null) : row.harbours;
          const listingImages = (row.listing_images ?? [])
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .filter((image) => typeof image.image_url === "string" && image.image_url.length > 0);

          const harbourReviews =
            row.harbour_id != null
              ? reviewStats?.filter((r) => String(r.harbour_id) === String(row.harbour_id)) || []
              : [];
          const avgRating =
            harbourReviews.length > 0
              ? harbourReviews.reduce((sum, r) => sum + r.rating, 0) / harbourReviews.length
              : null;

          return {
            id: row.id,
            harbour_id: row.harbour_id ?? null,
            title: row.title,
            description: row.description,
            price_per_season: row.price_per_season,
            max_boat_length: row.max_boat_length,
            max_boat_width: row.max_boat_width,
            max_boat_depth: row.max_boat_depth ?? null,
            season_start: row.season_start,
            season_end: row.season_end,
            rental_type: row.rental_type ?? "season",
            city: row.city ?? harbour?.city ?? null,
            harbour_name: row.harbour_name ?? harbour?.name ?? null,
            address: harbour?.address ?? null,
            listing_type: row.listing_type ?? null,
            area: harbour?.area ?? null,
            zip_code: harbour?.zip_code ?? null,
            image_url: row.image_url,
            listing_images: listingImages,
            is_available: row.is_available,
            lat: row.lat ?? harbour?.lat ?? null,
            lng: row.lng ?? harbour?.lng ?? null,
            created_at: row.created_at,
            average_rating: avgRating,
            review_count: harbourReviews.length,
          } satisfies KajplatsListing;
        });

        setListings(normalized);
      } catch (loadError) {
        console.error(loadError);
        setError("Kunde inte ladda båtplatser just nu.");
      } finally {
        setLoading(false);
      }
    };

    void loadListings();
  }, [selectedHarbourId, supabase, cityQuery, startQuery, endQuery, rentalQuery, seasonYearQuery, lengthQuery, widthQuery, depthQuery]);

  const trimmedLocationInput = locationInput.trim();
  const trimmedLocationQuery = activeLocationQuery.trim();
  const normalizedLocationQuery = normalizeValue(activeLocationQuery);
  const normalizedLocationZip = normalizeZipValue(activeLocationQuery);
  const normalizedZipQuery = normalizeZipValue(zipQuery);
  const effectiveZipQuery = normalizedZipQuery || normalizedLocationZip;
  const searchQuery = (trimmedLocationQuery || formatSwedishZip(effectiveZipQuery)).trim();
  const hasLocationOrZipSearch = isLocationSearchActive && searchQuery.length > 0;
  const activeSearchCenter = geocodedCenter;
  const parsedLength = Number(lengthQuery);
  const hasLengthFilter = lengthQuery.trim() !== "" && Number.isFinite(parsedLength);
  const parsedWidth = Number(widthQuery);
  const hasWidthFilter = widthQuery.trim() !== "" && Number.isFinite(parsedWidth);
  const parsedDepth = Number(depthQuery);
  const hasDepthFilter = depthQuery.trim() !== "" && Number.isFinite(parsedDepth);
  const hasShortTermDateFilter =
    rentalQuery === "short_term" &&
    startQuery.trim() !== "" &&
    endQuery.trim() !== "" &&
    hasValidDateRange(startQuery, endQuery);
  const hasRentalFilter = rentalQuery !== "all";
  const hasUrlFilters = Boolean(
    cityQuery.trim() ||
      selectedAreas.length > 0 ||
      hasShortTermDateFilter ||
      hasRentalFilter ||
      hasLengthFilter ||
      hasWidthFilter ||
      hasDepthFilter ||
      selectedHarbourId,
  );

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!hasLocationOrZipSearch || !apiKey) {
      setGeocodedCenter(null);
      setGeocodeError(!apiKey && hasLocationOrZipSearch ? "Geocoding API-nyckel saknas." : null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const looksLikeZip = /^\d{5}$/.test(searchQuery.replace(/\s+/g, ""));
      const queryVariants = [
        searchQuery,
        looksLikeZip ? `${searchQuery} Stockholm` : `${searchQuery}, Stockholm`,
        `${searchQuery}, Stockholm, Sweden`,
      ];

      try {
        console.log("Geocoding query:", searchQuery);
        let resolvedLocation: { lat: number; lng: number } | null = null;

        for (const candidate of queryVariants) {
          const url =
            `https://maps.googleapis.com/maps/api/geocode/json?` +
            `address=${encodeURIComponent(candidate)}&` +
            `components=country:SE&` +
            `key=${apiKey}`;

          const response = await fetch(url);
          const payload = (await response.json()) as {
            status?: string;
            results?: Array<{
              formatted_address?: string;
              geometry?: { location?: { lat?: number; lng?: number } };
            }>;
            error_message?: string;
          };

          console.log("Geocoding response:", {
            candidate,
            status: payload.status,
            error_message: payload.error_message,
            results_count: payload.results?.length ?? 0,
            first_result: payload.results?.[0]?.formatted_address ?? null,
          });

          const location = payload.results?.[0]?.geometry?.location;
          if (payload.status === "OK" && location?.lat != null && location?.lng != null) {
            resolvedLocation = { lat: location.lat, lng: location.lng };
            break;
          }
        }

        if (!cancelled && resolvedLocation) {
          console.log("Found coordinates:", resolvedLocation.lat, resolvedLocation.lng);
          setGeocodedCenter(resolvedLocation);
          setGeocodeError(null);
        } else if (!cancelled) {
          setGeocodedCenter(null);
          setGeocodeError("Plats kunde inte hittas.");
        }
      } catch {
        if (!cancelled) {
          setGeocodedCenter(null);
          setGeocodeError("Kunde inte ansluta till geocoding-tjänsten.");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasLocationOrZipSearch, searchQuery]);

  const effectiveSortBy: "default" | "nearest" =
    userLocation && sortBy === "default" ? "nearest" : sortBy;

  const handleLocationSearch = () => {
    const nextQuery = trimmedLocationInput;
    setActiveLocationQuery(nextQuery);
    setIsLocationSearchActive(Boolean(nextQuery));
    setSearchActive(Boolean(nextQuery));
  };

  const handleAddTag = useCallback((tag: AreaTag) => {
    setSelectedAreas((prev) => {
      if (prev.some((item) => item.name.toLowerCase() === tag.name.toLowerCase())) return prev;
      return [...prev, tag];
    });
    setSearchActive(true);
  }, []);

  const handleUpdateTagPolygon = useCallback((tagId: string, polygon: GeoJsonGeometry) => {
    console.log("handleUpdateTagPolygon called for tag:", tagId);
    console.log("Polygon received:", polygon?.type);
    setSelectedAreas((prev) =>
      prev.map((tag) => (tag.id === tagId ? { ...tag, polygon } : tag)),
    );
  }, []);

  const handleRemoveTag = useCallback((tagId: string) => {
    setSelectedAreas((prev) => prev.filter((tag) => tag.id !== tagId));
  }, []);

  const handleSearch = () => {
    setDateError("");
    if (rentalPeriod === "short_term") {
      if ((startDate && !endDate) || (!startDate && endDate)) {
        setDateError("Välj både in- och utcheckning");
        return;
      }
      if (startDate && endDate && !hasValidDateRange(startDate, endDate)) {
        setDateError("Slutdatum måste vara efter startdatum");
        return;
      }
    }

    const params = new URLSearchParams();
    if (selectedAreas.length > 0) {
      params.set("areas", areaTagsToParam(selectedAreas));
    } else {
      const locationValue = locationInput.trim();
      if (locationValue) {
        params.set("area", locationValue);
        params.set("city", locationValue);
      }
      if (isZipSearchValue(locationValue)) {
        const normalizedZip = normalizeZipValue(locationValue);
        if (normalizedZip) params.set("zip", formatSwedishZip(normalizedZip));
      }
    }
    if (rentalPeriod !== "all") {
      params.set("rental", rentalPeriod);
    }
    if (rentalPeriod === "seasonal") {
      params.set("season", seasonYear);
    }
    if (rentalPeriod === "short_term") {
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
    }
    if (lengthInput) params.set("length", lengthInput);
    if (widthInput) params.set("width", widthInput);
    if (depthInput) params.set("depth", depthInput);
    if (selectedHarbourId) params.set("harbour_id", selectedHarbourId);

    const queryString = params.toString();
    router.push(queryString ? `/kajplatser?${queryString}` : "/kajplatser");
    setActiveLocationQuery(locationInput.trim());
    setIsLocationSearchActive(Boolean(locationInput.trim()));
    setSearchActive(
      Boolean(
        selectedAreas.length > 0 ||
          locationInput.trim() ||
          rentalPeriod !== "all" ||
          startDate ||
          endDate ||
          lengthInput ||
          widthInput ||
          depthInput,
      ),
    );
  };

  const handleListingMarkerClick = useCallback((listingId: string | number) => {
    setFocusedListingId(listingId);
    const card = document.getElementById(`listing-card-${listingId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleResetSearch = () => {
    setLocationInput("");
    setLocationQuery("");
    setStartDate("");
    setEndDate("");
    setRentalPeriod("all");
    setSeasonYear("2026");
    setLengthInput("");
    setWidthInput("");
    setDepthInput("");
    setSelectedAreas([]);
    setDateError("");
    setActiveLocationQuery("");
    setIsLocationSearchActive(false);
    setSearchActive(false);
    setGeocodedCenter(null);
    setRadiusInputKm(10);
    setRadiusKm(10);
    setHoveredListingId(null);
    setFocusedListingId(null);
  };

  const handleClearFilters = () => {
    handleResetSearch();
    router.push("/kajplatser");
  };

  useEffect(() => {
    if (!activeSearchCenter || listings.length === 0) return;
    console.log("Search center:", activeSearchCenter.lat, activeSearchCenter.lng);
    console.log("Checking listings:");
    listings.forEach((listing) => {
      if (listing.lat == null || listing.lng == null) {
        console.log(`- ${listing.title}: missing coordinates`);
        return;
      }
      const distance = haversineDistanceKm(activeSearchCenter.lat, activeSearchCenter.lng, Number(listing.lat), Number(listing.lng));
      console.log(`- ${listing.title}: ${distance.toFixed(2)} km`);
    });
  }, [activeSearchCenter, listings]);

  const proximityFallbackTagIds = useMemo(
    () => (selectedAreas.length > 0 ? getProximityFallbackTagIds(listings, selectedAreas) : new Set<string>()),
    [listings, selectedAreas],
  );
  const usesProximityFallback =
    selectedAreas.length > 0 && selectedAreas.some((tag) => proximityFallbackTagIds.has(tag.id));

  const displayedListings = useMemo(() => {
    const base = listings.map((listing) => ({
      ...listing,
      distance_km: null,
      user_distance_km: travelMap[String(listing.id)]?.km ?? null,
      user_drive_text: travelMap[String(listing.id)]?.driveText ?? null,
    }));

    const areaFiltered =
      selectedAreas.length > 0
        ? base.filter((listing) =>
            listingMatchesAreaTags(listing, selectedAreas, { proximityFallbackTagIds }),
          )
        : base;

    if (effectiveSortBy === "nearest" && userLocation) {
      return [...areaFiltered].sort(
        (a, b) =>
          (a.user_distance_km ?? Number.POSITIVE_INFINITY) - (b.user_distance_km ?? Number.POSITIVE_INFINITY),
      );
    }
    return areaFiltered;
  }, [listings, selectedAreas, proximityFallbackTagIds, effectiveSortBy, travelMap, userLocation]);

  const visibleListings = displayedListings;

  useEffect(() => {
    console.log("📍 Filtered listings for map:", visibleListings.length);
    console.log("🗺️ Search active:", searchActive);
  }, [visibleListings.length, searchActive]);

  const mapListings = useMemo<MapListing[]>(
    () =>
      visibleListings
        .map((listing) => ({
          id: listing.id,
          harbour_id: listing.harbour_id ?? null,
          title: listing.title,
          harbour_name: listing.harbour_name,
          city: listing.city,
          price_per_season: listing.price_per_season,
          max_boat_length: listing.max_boat_length,
          max_boat_width: listing.max_boat_width,
          is_available: listing.is_available,
          image_url: listing.listing_images[0]?.image_url ?? listing.image_url ?? null,
          season_start: listing.season_start,
          season_end: listing.season_end,
          lat: listing.lat != null ? Number(listing.lat) : null,
          lng: listing.lng != null ? Number(listing.lng) : null,
        })),
    [visibleListings],
  );

  const allMapListings = useMemo<MapListing[]>(
    () =>
      listings
        .map((listing) => ({
          id: listing.id,
          harbour_id: listing.harbour_id ?? null,
          title: listing.title,
          harbour_name: listing.harbour_name,
          city: listing.city,
          price_per_season: listing.price_per_season,
          max_boat_length: listing.max_boat_length,
          max_boat_width: listing.max_boat_width,
          is_available: listing.is_available,
          image_url: listing.listing_images[0]?.image_url ?? listing.image_url ?? null,
          season_start: listing.season_start,
          season_end: listing.season_end,
          lat: listing.lat != null ? Number(listing.lat) : null,
          lng: listing.lng != null ? Number(listing.lng) : null,
        }))
        .filter((listing) => listing.lat != null && listing.lng != null),
    [listings],
  );

  useEffect(() => {
    console.log("Listings for grid:", visibleListings);
    console.log("Listings for map:", mapListings);
    console.log("Listings missing map coordinates:", mapListings.filter((listing) => listing.lat == null || listing.lng == null).length);
  }, [visibleListings, mapListings]);

  const groupedSuggestions: Record<LocationSuggestionType, LocationSuggestion[]> = {
    harbour: [],
    area: [],
    city: [],
    zip: [],
  };
  for (const suggestion of locationSuggestions) {
    groupedSuggestions[suggestion.type].push(suggestion);
  }
  const orderedSuggestionTypes: LocationSuggestionType[] = ["harbour", "area", "city", "zip"];
  const showRadiusControl = Boolean(locationInput.trim());
  const locationSuggestionsDropdown =
    showLocationSuggestions && locationQuery.trim() ? (
      <div className="absolute left-0 right-0 z-40 mt-3 max-h-72 overflow-y-auto rounded-2xl border border-[#dce3ee] bg-white p-2 shadow-[0_12px_30px_rgba(15,31,61,0.16)]">
        {locationSuggestions.length === 0 && !isLocationLoading ? (
          <p className="px-3 py-3 text-sm text-[#8a96a8]">Inga resultat</p>
        ) : (
          orderedSuggestionTypes.map((type) => {
            const items = groupedSuggestions[type];
            if (items.length === 0) return null;

            return (
              <div key={type} className="mb-1 last:mb-0">
                <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8a96a8]">
                  {LOCATION_TYPE_LABELS[type]}
                </p>
                {items.map((suggestion) => (
                  <button
                    key={suggestion.key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setLocationInput(suggestion.value);
                      setLocationQuery(suggestion.value);
                      setShowLocationSuggestions(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-xl px-3 py-3 text-left transition hover:bg-[#f5f0e8]"
                  >
                    <span className="mt-0.5 text-base leading-none text-[#0d9488]" aria-hidden>
                      📍
                    </span>
                    <span className="min-w-0 text-sm text-[#4a5568]">
                      <span className="block truncate">{renderHighlightedText(suggestion.label, locationQuery)}</span>
                      {suggestion.secondary ? (
                        <span className="block truncate text-xs text-[#8a96a8]">
                          {renderHighlightedText(suggestion.secondary, locationQuery)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
    ) : null;

  const resultCountLabel = loading
    ? "Laddar..."
    : formatAreaResultCount(visibleListings.length, selectedAreas, {
        useProximityLabel: usesProximityFallback,
      });

  const mapProps = {
    listings: selectedAreas.length > 0 ? allMapListings : mapListings,
    filteredListings: selectedAreas.length > 0 ? mapListings : undefined,
    shouldFitBounds: selectedAreas.length > 0 || hasUrlFilters,
    center: null,
    radiusKm: null,
    areaTags: selectedAreas,
    hoveredListingId,
    highlightedListingId: focusedListingId,
    onListingMarkerClick: handleListingMarkerClick,
  };

  const resultsContent = error ? (
    <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] p-6 text-sm text-[#d64c3b]">{error}</div>
  ) : loading ? (
    <div className="space-y-3">
      {[...Array(4)].map((_, idx) => (
        <div key={`kajplats-skeleton-${idx}`} className="h-44 w-full animate-pulse rounded-xl bg-[#dce3ee]" />
      ))}
    </div>
  ) : visibleListings.length === 0 ? (
    <div className="rounded-xl border border-[#dce3ee] bg-white p-10 text-center shadow-[0_1px_4px_rgba(15,31,61,0.08)]">
      {hasUrlFilters ? (
        <>
          <h2 className="text-xl font-bold text-[#0a1628]">Inga båtplatser matchar din sökning</h2>
          <p className="mt-2 text-sm text-[#4a5568]">Prova att justera datum, område eller båtstorlek.</p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-6 rounded-lg bg-[#0d9488] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14b8a6]"
          >
            Rensa filter
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold text-[#0a1628]">Inga platser tillgängliga ännu.</h2>
          <p className="mt-2 text-sm text-[#4a5568]">Bli första hamnägaren att lista platser!</p>
          {selectedAreas.length > 0 ? (
            <p className="mt-2 text-sm text-[#4a5568]">
              Inga båtplatser hittades i {formatAreaNamesList(selectedAreas)}. Prova att lägga till ett annat område
              eller justera filtren.
            </p>
          ) : null}
        </>
      )}
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2">
      {visibleListings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isHighlighted={String(listing.id) === String(hoveredListingId)}
          onHoverListing={setHoveredListingId}
        />
      ))}
    </div>
  );

  const mobileMapOverlay =
    mobileMapOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex flex-col bg-[#0a1628] lg:hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
              <p className="text-sm font-semibold">Karta</p>
              <button
                type="button"
                onClick={() => setMobileMapOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Stäng
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <BerthMap height="100%" borderless className="h-full" {...mapProps} />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <main className="min-h-screen bg-brand-cream text-[#0a1628]">
      <AuthNavbar currentPage="search" />

      <section className="overflow-visible bg-brand-cream px-4 pb-4 pt-24 md:px-6">
        <div className="mx-auto w-full max-w-[900px] overflow-visible">
          <div className="mb-6 text-center">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand-teal">Båtplatser</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0a1628] md:text-3xl">
              Hitta din båtplats
            </h1>
          </div>

          {!userLocation && !locationRequested ? (
            <div className="mb-4 text-center">
              <button
                type="button"
                onClick={requestUserLocation}
                className="text-sm font-medium text-[#0d9488] underline-offset-2 hover:underline"
              >
                Tillåt platsåtkomst för att se avstånd till hamnar
              </button>
            </div>
          ) : null}

          <ListingSearchBar
            selectedAreas={selectedAreas}
            onAddTag={handleAddTag}
            onUpdateTagPolygon={handleUpdateTagPolygon}
            onRemoveTag={handleRemoveTag}
            rentalPeriod={rentalPeriod}
            seasonYear={seasonYear}
            onRentalPeriodChange={setRentalPeriod}
            onSeasonYearChange={setSeasonYear}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(value) => {
              setStartDate(value);
              setDateError("");
            }}
            onEndDateChange={(value) => {
              setEndDate(value);
              setDateError("");
            }}
            onDateError={(message) => setDateError(message ?? "")}
            dateError={dateError}
            boatLength={lengthInput}
            onBoatLengthChange={setLengthInput}
            boatWidth={widthInput}
            onBoatWidthChange={setWidthInput}
            boatDepth={depthInput}
            onBoatDepthChange={setDepthInput}
            onSearch={handleSearch}
          />

          <div className="mt-3 flex items-center justify-center gap-4">
            {(hasUrlFilters || selectedAreas.length > 0) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm font-medium text-[#0d9488] underline-offset-2 hover:underline"
              >
                Rensa
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-brand-cream px-4 pb-10 pt-2 md:px-6">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-semibold text-[#0a1628]">{resultCountLabel}</p>
            <SortSelect
              compact
              value={sortBy}
              onChange={(value) => setSortBy(value as "default" | "nearest")}
            />
          </div>

          <div className="lg:grid lg:grid-cols-[58%_42%] lg:items-start lg:gap-6">
            <div className="min-w-0">{resultsContent}</div>
            <div className="sticky top-20 hidden h-[calc(100vh-6rem)] min-h-[480px] lg:block">
              <BerthMap height="100%" borderless className="h-full rounded-xl border border-[#dce3ee]" {...mapProps} />
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setMobileMapOpen(true)}
        className="fixed bottom-6 left-1/2 z-50 inline-flex min-h-[44px] -translate-x-1/2 items-center gap-2 rounded-full bg-[#0a1628] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(10,22,40,0.35)] lg:hidden"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 16.382V6.618a2 2 0 011.553-1.947L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A2 2 0 0021 16.382V6.618a2 2 0 00-1.553-1.947L15 2m0 18V2" />
        </svg>
        Visa karta
      </button>

      {mobileMapOverlay}

      <Footer />
      <style jsx>{`
        .brand-radius-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            #0d9488 0%,
            #14b8a6 var(--range-progress),
            #dce3ee var(--range-progress),
            #dce3ee 100%
          );
          outline: none;
          transition: filter 0.2s ease;
        }

        .brand-radius-slider:hover {
          filter: brightness(1.03);
        }

        .brand-radius-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #0d9488;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 10px rgba(15, 31, 61, 0.24);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .brand-radius-slider::-webkit-slider-thumb:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 14px rgba(15, 31, 61, 0.3);
        }

        .brand-radius-slider::-moz-range-track {
          height: 12px;
          border-radius: 999px;
          background: #dce3ee;
        }

        .brand-radius-slider::-moz-range-progress {
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, #0d9488 0%, #14b8a6 100%);
        }

        .brand-radius-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #0d9488;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 10px rgba(15, 31, 61, 0.24);
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .brand-radius-slider::-moz-range-thumb:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 14px rgba(15, 31, 61, 0.3);
        }
      `}</style>
    </main>
  );
}

export default function KajplatserPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-brand-cream text-[#0a1628]">
          <p className="text-sm font-medium text-[#8a96a8]">Laddar...</p>
        </main>
      }
    >
      <KajplatserContent />
    </Suspense>
  );
}
