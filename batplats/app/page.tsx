"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AuthNavbar from "@/components/auth-navbar";
import BerthMap from "@/components/BerthMap";
import Footer from "@/components/footer";
import BoatLengthSelect from "@/components/BoatLengthSelect";
import DateRangePicker from "@/components/DateRangePicker";
import RentalTypeBadge from "@/components/RentalTypeBadge";
import LandingHeroWave from "@/components/landing-hero-wave";
import { hasValidDateRange } from "@/lib/date-range";
import RevealOnView from "@/components/reveal-on-view";
import { getListingImageSrc } from "@/lib/listing-image";
import { createClient } from "@/lib/supabase/client";
import type { MapListing } from "@/components/BerthMap";

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

type FeaturedListingImage = {
  id: number | string;
  image_url: string;
  display_order: number;
};

type FeaturedListing = {
  id: number | string;
  harbour_name: string;
  title: string;
  city: string;
  max_boat_length: number | null;
  max_boat_width: number | null;
  price_per_season: number;
  image_url: string | null;
  listing_images: FeaturedListingImage[];
  listing_type?: string | null;
  rental_type?: string | null;
};

const LOCATION_TYPE_LABELS: Record<LocationSuggestionType, string> = {
  harbour: "Hamnar",
  city: "Städer",
  area: "Områden",
  zip: "Postnummer",
};

const normalizeSearchValue = (value: string) => value.toLowerCase().trim();
const normalizeZipValue = (value: string) => value.replace(/\D/g, "");
const formatSwedishZip = (value: string) => {
  const digits = normalizeZipValue(value);
  if (digits.length < 4) return value.trim();
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)}`.trim();
};
const isZipSearchValue = (value: string) => /^\d[\d\s]*$/.test(value.trim());

const includesMatch = (value: string | null | undefined, query: string) =>
  Boolean(value && normalizeSearchValue(value).includes(query));
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

function FeaturedListingCard({ listing }: { listing: FeaturedListing }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const images = listing.listing_images || [];
  const totalImages = images.length;
  const currentImageUrl = images[currentImageIndex]?.image_url ?? listing.image_url;

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
    <Link href={`/listings/${listing.id}`} className="group">
      <div
        className="relative mb-3 aspect-square overflow-hidden rounded-xl"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Image
          src={getListingImageSrc(currentImageUrl)}
          alt={listing.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-medium text-teal-700 backdrop-blur-sm">
          Tillgänglig
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="absolute right-3 top-3 p-2 transition hover:scale-110"
          aria-label="Spara plats"
        >
          <svg className="h-6 w-6 fill-transparent stroke-white hover:fill-white/20" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>

        {totalImages > 1 && isHovering ? (
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

        {totalImages > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
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

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{listing.harbour_name}</p>
        {listing.listing_type === "private" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            🚤 Privat uthyrning
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">{listing.title}</h3>
          <RentalTypeBadge rentalType={listing.rental_type} />
        </div>
        <p className="text-sm text-gray-600">
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
            {listing.city}
          </span>
          <span className="mx-2">·</span>
          <span>{listing.max_boat_length ?? "-"}m längd</span>
          <span className="mx-2">·</span>
          <span>{listing.max_boat_width ?? "-"}m bredd</span>
        </p>
        <p className="pt-1 text-gray-900">
          <span className="font-semibold">{listing.price_per_season.toLocaleString("sv-SE")} kr</span>
          <span className="font-normal text-gray-600"> / säsong</span>
        </p>
      </div>
    </Link>
  );
}

function HomeContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [location, setLocation] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] = useState<LocationSuggestion | null>(null);
  const [boatLength, setBoatLength] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>([]);
  const [mapListings, setMapListings] = useState<MapListing[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [stats, setStats] = useState({
    marinas: "0",
    listings: "0",
    cities: "0",
    bookings: "0",
  });

  const handleSearch = () => {
    setDateError("");
    if ((startDate && !endDate) || (!startDate && endDate)) {
      setDateError("Välj både start- och slutdatum");
      return;
    }
    if (startDate && endDate && !hasValidDateRange(startDate, endDate)) {
      setDateError("Slutdatum måste vara efter startdatum");
      return;
    }

    const params = new URLSearchParams();
    const locationValue = location.trim();
    if (locationValue) params.set("city", locationValue);
    const zipSearchValue =
      selectedLocationSuggestion?.type === "zip" ? selectedLocationSuggestion.value : locationValue;
    if (isZipSearchValue(zipSearchValue)) {
      const normalizedZip = normalizeZipValue(zipSearchValue);
      if (normalizedZip) params.set("zip", formatSwedishZip(normalizedZip));
    }
    if (selectedLocationSuggestion) {
      params.set("locationType", selectedLocationSuggestion.type);
      if (selectedLocationSuggestion.harbourId != null) {
        params.set("harbour_id", String(selectedLocationSuggestion.harbourId));
      }
      if (selectedLocationSuggestion.lat != null) params.set("lat", String(selectedLocationSuggestion.lat));
      if (selectedLocationSuggestion.lng != null) params.set("lng", String(selectedLocationSuggestion.lng));
    }
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (boatLength) params.set("length", boatLength);
    const queryString = params.toString();
    router.push(queryString ? `/kajplatser?${queryString}` : "/kajplatser");
  };

  useEffect(() => {
    const query = normalizeSearchValue(locationQuery);
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
        const { data, error } = await supabase
          .from("harbours")
          .select("id, name, city, zip_code, area, lat, lng, owner_id")
          .not("owner_id", "is", null)
          .or(`name.ilike.%${query}%,city.ilike.%${query}%,zip_code.ilike.%${query}%${zipOrClause},area.ilike.%${query}%`)
          .limit(8);

        if (error) {
          console.error("Failed to fetch location suggestions:", error);
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
          if (includesZipMatch(row.zip_code, locationQuery) || includesMatch(row.zip_code, query)) addSuggestion("zip", row);
        }

        if (!cancelled) {
          setLocationSuggestions(suggestions.slice(0, 8));
        }
      } catch (error) {
        console.error("Unexpected location suggestion error:", error);
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

  useEffect(() => {
    const loadMapListings = async () => {
      setIsMapLoading(true);
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            "id, harbour_id, title, price_per_season, is_available, lat, lng, image_url, max_boat_length, max_boat_width, harbours!inner(id, name, city, lat, lng, owner_id)",
          )
          .eq("is_available", true)
          .not("owner_id", "is", null)
          .not("harbours.owner_id", "is", null);
        if (error) {
          console.error("Failed to fetch homepage map listings:", error);
          setMapListings([]);
          return;
        }
        const normalized = ((data ?? []) as Array<{
          id: number | string;
          harbour_id?: number | string | null;
          title: string;
          price_per_season: number | null;
          is_available: boolean;
          lat: number | null;
          lng: number | null;
          image_url: string | null;
          max_boat_length: number | null;
          max_boat_width: number | null;
          harbours:
            | {
                id: number | string;
                name: string | null;
                city: string | null;
                lat: number | null;
                lng: number | null;
              }
            | Array<{
                id: number | string;
                name: string | null;
                city: string | null;
                lat: number | null;
                lng: number | null;
              }>
            | null;
        }>)
          .map((row) => {
            const harbour = Array.isArray(row.harbours) ? (row.harbours[0] ?? null) : row.harbours;
            const lat = row.lat ?? harbour?.lat ?? null;
            const lng = row.lng ?? harbour?.lng ?? null;
            if (lat == null || lng == null) return null;
            return {
              id: row.id,
              harbour_id: row.harbour_id ?? harbour?.id ?? null,
              title: row.title,
              harbour_name: harbour?.name ?? null,
              city: harbour?.city ?? null,
              price_per_season: row.price_per_season,
              is_available: row.is_available,
              image_url: row.image_url ?? null,
              max_boat_length: row.max_boat_length ?? null,
              max_boat_width: row.max_boat_width ?? null,
              season_start: null,
              season_end: null,
              lat: Number(lat),
              lng: Number(lng),
            } satisfies MapListing;
          })
          .filter((row) => {
            if (!row) return false;
            if (row.harbour_id === undefined) return false;
            return true;
          }) as MapListing[];
        setMapListings(normalized);
      } catch (error) {
        console.error("Unexpected homepage map listing error:", error);
        setMapListings([]);
      } finally {
        setIsMapLoading(false);
      }
    };
    void loadMapListings();
  }, [supabase]);

  useEffect(() => {
    const loadHomepageData = async () => {
      try {
        const [listingsResult, availableResult, bookingsResult, featured] = await Promise.all([
          supabase
            .from("listings")
            .select("harbour_name, city, owner_id, harbours!inner(owner_id)")
            .not("owner_id", "is", null)
            .not("harbours.owner_id", "is", null),
          supabase
            .from("listings")
            .select("id, harbours!inner(owner_id)", { count: "exact", head: true })
            .not("owner_id", "is", null)
            .not("harbours.owner_id", "is", null),
          supabase.from("bookings").select("*", { count: "exact", head: true }),
          supabase
            .from("listings")
            .select(
              "id, harbour_id, title, image_url, price_per_season, max_boat_length, max_boat_width, listing_type, rental_type, owner_id, harbours!inner(id, name, city, owner_id), listing_images(id, image_url, display_order)",
            )
            .eq("is_available", true)
            .not("owner_id", "is", null)
            .not("harbours.owner_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (listingsResult.error) console.error(listingsResult.error);
        if (availableResult.error) console.error(availableResult.error);
        if (bookingsResult.error) console.error(bookingsResult.error);

        const uniqueHarbours = new Set(
          listingsResult.data?.map((listing) => listing.harbour_name).filter(Boolean),
        ).size;

        const uniqueCities = new Set(
          listingsResult.data?.map((listing) => listing.city).filter(Boolean),
        ).size;

        const availableCount = availableResult.count || 0;
        const bookingsCount = bookingsResult.count || 0;

        if (featured.error) {
          console.error(featured.error);
        } else if (featured.data) {
          const listingsByHarbour = new Map<string, (typeof featured.data)[number]>();
          for (const listing of featured.data) {
            const harbour = Array.isArray(listing.harbours) ? listing.harbours[0] : listing.harbours;
            const harbourKey = String(listing.harbour_id ?? harbour?.id ?? "");
            if (!harbourKey) continue;
            if (!listingsByHarbour.has(harbourKey)) {
              listingsByHarbour.set(harbourKey, listing);
            }
          }
          const uniqueFeatured = Array.from(listingsByHarbour.values()).slice(0, 4);
          setFeaturedListings(
            uniqueFeatured.map((listing) => {
              const harbour = Array.isArray(listing.harbours)
                ? listing.harbours[0]
                : listing.harbours;
              const listingImages = (listing.listing_images ?? []).slice().sort((a, b) => a.display_order - b.display_order);

              return {
                id: listing.id,
                harbour_name: harbour?.name ?? "Hamn",
                title: listing.title,
                city: harbour?.city ?? "Okänd stad",
                max_boat_length: listing.max_boat_length ?? null,
                max_boat_width: listing.max_boat_width ?? null,
                price_per_season: listing.price_per_season ?? 0,
                image_url: listing.image_url ?? null,
                listing_images: listingImages,
                listing_type: (listing as { listing_type?: string | null }).listing_type ?? null,
                rental_type: (listing as { rental_type?: string | null }).rental_type ?? "season",
              };
            }),
          );
        }

        setStats({
          marinas: uniqueHarbours.toLocaleString("sv-SE"),
          listings: availableCount.toLocaleString("sv-SE"),
          cities: uniqueCities.toLocaleString("sv-SE"),
          bookings: bookingsCount.toLocaleString("sv-SE"),
        });
      } catch (loadError) {
        console.error(loadError);
      }
    };

    void loadHomepageData();
  }, [supabase]);

  const marinas = [
    {
      name: "Goteborg Maritim",
      spots: "18 platser tillgängliga",
      imageSrc: "https://picsum.photos/seed/dock12/600/400",
    },
    {
      name: "Stockholms Segelsallskap",
      spots: "14 platser tillgängliga",
      imageSrc: "https://picsum.photos/seed/dock34/600/400",
    },
    {
      name: "Bockholmen Marin",
      spots: "6 platser tillgängliga",
      imageSrc: "/Bockholmen/IMG_1603-2048x1536.jpeg",
    },
    {
      name: "Nynäshamn Hamn",
      spots: "10 platser tillgängliga",
      imageSrc: "/Bockholmen/IMG_1601-1536x1152.jpeg",
    },
  ];

  const testimonials = [
    {
      quote:
        "Hittade en perfekt plats i Nacka på tio minuter. Hamnen svarade direkt och jag hade bekräftad bokning samma dag. Otroligt smidigt.",
      name: "Magnus Karlsson",
      meta: "Båtägare, Täby · Bayliner 285",
      initials: "MK",
      avatarBg: "bg-[#0d9488]",
    },
    {
      quote:
        "Äntligen ett modernt alternativ till de gamla väntelistorna. Plats på Sandhamn, något jag aldrig trodde jag skulle hitta så lätt.",
      name: "Sara Lindström",
      meta: "Båtägare, Lidingö · Hallberg-Rassy 29",
      initials: "SL",
      avatarBg: "bg-[#1a3260]",
    },
    {
      quote:
        "Som hamnägare har Båtplats fyllt alla våra platser inför säsongen. Administrationen är minimal och betalningarna sköter sig själva.",
      name: "Erik Persson",
      meta: "Hamnägare · Vasahamnen, Lidingö",
      initials: "EP",
      avatarBg: "bg-[#2a4a85]",
    },
  ];

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

  return (
    <main className="min-h-screen bg-[#fafcff] text-[#0f1f3d]">
      <AuthNavbar currentPage="home" />

      {/* Hero — landing design (wave canvas, glow, full-width search) */}
      <section className="relative flex min-h-[min(100vh,920px)] flex-col justify-center overflow-x-hidden overflow-y-visible bg-[#0f1f3d] px-4 pb-28 pt-28 sm:px-6 sm:pb-24 sm:pt-32 md:px-12">
        <LandingHeroWave />
        <div
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(13,148,136,0.18)_0%,transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-[-200px] top-0 h-full w-[500px] bg-[linear-gradient(135deg,transparent_40%,rgba(20,184,166,0.04)_60%,transparent_80%)]"
          aria-hidden
        />

        <div className="relative z-[2] mx-auto w-full max-w-[760px] overflow-visible text-center">
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white">
            Hitta din båtplats
            <br />
            <span className="text-[#0d9488]">eller hyr ut din egen</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[520px] text-base font-normal leading-relaxed text-white/60 sm:text-lg">
            Sveriges marketplace för båtplatser. Boka direkt från hamnar och privatpersoner i hela Sverige.
          </p>

          <div
            id="search-hero"
            className="relative z-30 mx-auto mt-10 w-full max-w-[700px] overflow-visible rounded-[2.25rem] bg-white p-2 shadow-[0_8px_40px_rgba(0,0,0,0.3)] ring-1 ring-white/10 md:p-1.5"
          >
            <div className="flex flex-col gap-2 overflow-visible md:flex-row md:items-stretch md:gap-0 md:pr-1">
              <label className="search-field group flex w-full flex-1 cursor-text flex-col rounded-[2rem] px-4 py-3 transition-colors hover:bg-[#f5f0e8] md:px-5 md:py-2.5">
                <span className="text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1628]">
                  Område
                </span>
                <div className="relative mt-0.5">
                  <input
                    type="text"
                    placeholder="Stockholm, Östermalm eller 115 21"
                    value={location}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setLocation(nextValue);
                      setLocationQuery(nextValue);
                      setSelectedLocationSuggestion(null);
                      setShowLocationSuggestions(true);
                    }}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowLocationSuggestions(false), 120);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="min-h-[44px] w-full bg-transparent pr-6 text-base text-[#4a5568] outline-none placeholder:text-[#8a96a8] md:min-h-0 md:text-sm"
                  />
                  {isLocationLoading ? (
                    <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#0d9488]" aria-hidden>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-80"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </span>
                  ) : null}
                  {showLocationSuggestions && locationQuery.trim() ? (
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
                                    setLocation(suggestion.value);
                                    setLocationQuery(suggestion.value);
                                    setSelectedLocationSuggestion(suggestion);
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
                  ) : null}
                </div>
              </label>
              <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] md:block md:h-9" />
              <div className="w-full flex-1 md:w-auto">
                <DateRangePicker
                  variant="field"
                  fieldLabel="Datum"
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
                  showLegend={false}
                  className="w-full"
                />
              </div>
              <div className="hidden w-px shrink-0 self-center bg-[#dce3ee] md:block md:h-9" />
              <div className="w-full flex-1 md:w-auto">
                <BoatLengthSelect value={boatLength} onChange={setBoatLength} className="w-full" />
              </div>
              {dateError ? (
                <p className="px-2 text-sm text-red-500 md:col-span-full">{dateError}</p>
              ) : null}
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#0d9488] px-6 py-3.5 text-base font-semibold text-white shadow-[0_4px_20px_rgba(13,148,136,0.35)] transition hover:scale-[1.02] hover:bg-[#14b8a6] md:mt-0 md:ml-1 md:w-auto md:self-center md:text-[15px]"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8" />
                  <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Sök platser
              </button>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-white/50 sm:gap-x-7">
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">{stats.listings}+</strong>
              Tillgängliga platser
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">{stats.marinas}+</strong>
              Partnerhamnar
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">{stats.cities}+</strong>
              Städer
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <div className="flex items-center gap-2">
              <strong className="font-semibold text-white/85">Direkt</strong>
              Bokning
            </div>
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 right-0 h-16 w-full text-[#f5f0e8] sm:h-20"
          viewBox="0 0 1440 80"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 40Q360 10 720 40Q1080 70 1440 40L1440 80L0 80Z"
            fill="currentColor"
          />
        </svg>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-[#f5f0e8] px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 grid gap-10 md:mb-16 md:grid-cols-2 md:gap-20 lg:items-center">
            <div>
              <RevealOnView>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">
                  Hur det fungerar
                </p>
              </RevealOnView>
              <RevealOnView delayClass="delay-75">
                <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
                  Säsongsplats på
                  <br />
                  några minuter
                </h2>
              </RevealOnView>
              <RevealOnView delayClass="delay-150">
                <h3 className="mt-4 text-lg font-bold text-[#0f1f3d]">För båtägare</h3>
              </RevealOnView>
            </div>
            <RevealOnView delayClass="delay-150">
              <p className="text-[17px] leading-relaxed text-[#4a5568]">
                Ingen lång väntelista, inga telefonsamtal. Hitta en ledig plats från hamnar och privatpersoner, välj din
                säsong och betala säkert direkt via Båtplats.nu.
              </p>
            </RevealOnView>
          </div>

          <div className="grid gap-8 md:grid-cols-3 md:gap-8">
            {[
              {
                num: "01",
                title: "Sök & filtrera",
                desc: "Ange ditt område, båtlängd och önskad säsong. Se lediga platser från hamnar och privatpersoner.",
                icon: (
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="7" stroke="#0d9488" strokeWidth="1.8" />
                    <line x1="17" y1="17" x2="22" y2="22" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "Välj & boka",
                desc: "Välj din plats och säsong. Betala säkert direkt, ofta utan väntetid.",
                icon: (
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                    <rect x="3" y="5" width="20" height="16" rx="3" stroke="#0d9488" strokeWidth="1.8" />
                    <line x1="3" y1="10" x2="23" y2="10" stroke="#0d9488" strokeWidth="1.8" />
                    <line x1="9" y1="3" x2="9" y2="7" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="17" y1="3" x2="17" y2="7" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    <rect x="9" y="14" width="4" height="4" rx="1" fill="#0d9488" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Förtöj & njut",
                desc: "Få all information om platsen direkt efter bekräftad bokning.",
                icon: (
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                    <path
                      d="M6 18Q10 14 13 18Q16 22 20 18L19 21Q13 25 7 21Z"
                      stroke="#0d9488"
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinejoin="round"
                    />
                    <line x1="13" y1="18" x2="13" y2="10" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M13 10L18 14" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <RevealOnView key={step.title} delayClass={i === 1 ? "delay-75" : i === 2 ? "delay-150" : ""}>
                <div>
                  <div className="mb-4 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0d9488]">
                    {step.num}
                    <span className="h-px flex-1 bg-[#0d9488]/20" />
                  </div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-white shadow-[0_2px_12px_rgba(15,31,61,0.08)]">
                    {step.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-bold tracking-[-0.02em] text-[#0f1f3d]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#4a5568]">{step.desc}</p>
                </div>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* För vem? */}
      <section className="bg-[#f5f0e8] px-4 py-16 sm:px-6 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-[#0d9488]">För vem?</p>
          <h2 className="mb-12 text-center text-3xl font-bold text-[#0f1f3d]">Två sätt att använda Båtplats.nu</h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-[#dce3ee] bg-white p-8 shadow-[0_1px_4px_rgba(15,31,61,0.08)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4f0ec]">
                <svg className="h-6 w-6 text-[#0d9488]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold text-[#0f1f3d]">Letar du efter en plats?</h3>
              <p className="mb-6 text-[#4a5568]">
                Boka säsongsplats direkt från hamnar och privatpersoner. Filtrera på storlek, pris och område, betala
                säkert online.
              </p>
              <Link
                href="/kajplatser"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0d9488] px-6 py-3 font-medium text-white transition hover:bg-[#14b8a6]"
              >
                Sök båtplatser →
              </Link>
            </div>

            <div className="rounded-2xl bg-[#0f2942] p-8 shadow-[0_1px_4px_rgba(15,31,61,0.08)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d2252]">
                <svg className="h-6 w-6 text-[#14b8a6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Har du en plats att hyra ut?</h3>
              <p className="mb-6 text-gray-300">
                Oavsett om du driver en marina eller har en privat plats du inte använder, lista den och tjäna pengar på
                din plats.
              </p>
              <Link
                href="/hyr-ut"
                className="inline-flex items-center gap-2 rounded-xl bg-[#14b8a6] px-6 py-3 font-medium text-white transition hover:bg-[#0d9488]"
              >
                Hyr ut din plats →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — live data */}
      <section className="bg-[#0f1f3d] px-4 py-14 sm:px-6 md:px-12 md:py-16">
        <div className="mx-auto grid max-w-[1200px] gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {(
            [
              { value: stats.listings, label: "Tillgängliga platser", href: "/kajplatser", showPlus: true },
              { value: stats.marinas, label: "Partnerhamnar", href: "/kajplatser", showPlus: true },
              { value: stats.cities, label: "Städer", href: "/kajplatser", showPlus: true },
              { value: "Direkt", label: "Bokning", href: "/kajplatser", showPlus: false },
            ] as const
          ).map(({ value, label, href, showPlus }) => (
            <Link key={label} href={href} className="block text-center transition hover:opacity-90">
              <p className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-[-0.04em] text-white">
                {value}
                {showPlus ? <em className="not-italic text-[#14b8a6]">+</em> : null}
              </p>
              <p className="mt-2 text-[13px] text-white/50">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="scroll-mt-24 bg-[#fafcff] px-4 py-16 sm:px-6 md:px-12 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <RevealOnView>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Karta</p>
            <h2 className="mb-8 text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
              Utforska båtplatser på karta
            </h2>
          </RevealOnView>
          {isMapLoading ? (
            <div className="flex h-[480px] items-center justify-center rounded-[12px] border border-[#dce3ee] bg-white text-sm text-[#64748b]">
              Laddar kartan...
            </div>
          ) : mapListings.length === 0 ? (
            <div className="flex h-[480px] items-center justify-center rounded-[12px] border border-[#dce3ee] bg-white text-sm text-[#64748b]">
              Inga tillgängliga platser att visa på kartan just nu.
            </div>
          ) : (
            <div className="transition-opacity duration-300 ease-out opacity-100">
              <BerthMap
                height="480px"
                listings={mapListings}
                center={{ lat: 59.3293, lng: 18.0686 }}
                defaultZoom={11}
                groupByHarbour
              />
            </div>
          )}
        </div>
      </section>

      {/* Featured listings */}
      <section id="listings" className="scroll-mt-24 bg-[#fafcff] px-4 pb-16 sm:px-6 md:px-12 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <RevealOnView>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Utvalda platser</p>
              </RevealOnView>
              <RevealOnView delayClass="delay-75">
                <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
                  Populära bryggor
                  <br />
                  nära Stockholm
                </h2>
              </RevealOnView>
            </div>
            <RevealOnView>
              <Link
                href="/kajplatser"
                className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#e0f5f4] bg-transparent px-5 py-2.5 text-sm font-medium text-[#0d9488] transition hover:border-[#0d9488] hover:bg-[#e0f5f4]"
              >
                Se alla platser
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M3 7h8M8 4l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </RevealOnView>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {featuredListings.map((item, idx) => (
              <RevealOnView
                key={item.id}
                delayClass={idx === 1 ? "delay-75" : idx === 2 ? "delay-150" : ""}
                className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
              >
                <FeaturedListingCard listing={item} />
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Marinas */}
      <section className="bg-[#f5f0e8] px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-[1200px] text-center">
          <RevealOnView>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Hamnar</p>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold tracking-[-0.035em] text-[#0f1f3d]">
              Utforska hamnar
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-base text-[#8a96a8]">
              Utforska hamnar och båtplatser över hela landet, med tydliga priser och enkel bokning via båtplats.nu.
            </p>
          </RevealOnView>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {marinas.map((marina, i) => (
              <RevealOnView key={marina.name} delayClass={i === 1 ? "delay-75" : i === 2 ? "delay-150" : i === 3 ? "delay-200" : ""}>
                <Link
                  href="/kajplatser"
                  className="block rounded-xl border border-[#dce3ee] bg-white p-6 text-center transition hover:-translate-y-1 hover:border-[#0d9488] hover:shadow-lg"
                >
                  <div className="relative mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-[#dce3ee] bg-[#ebe6dc]">
                    <Image
                      src={marina.imageSrc}
                      alt={marina.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <h3 className="text-[0.95rem] font-bold">{marina.name}</h3>
                  <p className="mt-1 text-[0.82rem] text-[#8a96a8]">{marina.spots}</p>
                </Link>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#f5f0e8] px-4 pb-16 sm:px-6 md:px-12 md:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <RevealOnView>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d9488]">Vad båtägare säger</p>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.035em] text-[#0f1f3d]">
              Tusentals nöjda
              <br />
              båtplatssökare
            </h2>
          </RevealOnView>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <RevealOnView key={t.name} delayClass={i === 1 ? "delay-75" : i === 2 ? "delay-150" : ""}>
                <article className="h-full rounded-[22px] border border-[#dce3ee] bg-white p-8">
                  <div className="mb-4 flex gap-0.5 text-sm text-amber-500">
                    {"★★★★★".split("").map((s, j) => (
                      <span key={j}>{s}</span>
                    ))}
                  </div>
                  <p className="mb-5 text-[15px] italic leading-relaxed text-[#4a5568]">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${t.avatarBg}`}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0f1f3d]">{t.name}</p>
                      <p className="text-xs text-[#8a96a8]">{t.meta}</p>
                    </div>
                  </div>
                </article>
              </RevealOnView>
            ))}
          </div>
        </div>
      </section>

      {/* Harbour owners */}
      <section id="harbour-owners" className="relative scroll-mt-24 overflow-hidden bg-[#0f1f3d] px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          viewBox="0 0 1440 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path d="M0 200Q360 140 720 200Q1080 260 1440 200" stroke="white" strokeWidth="60" fill="none" />
          <path d="M0 350Q360 290 720 350Q1080 410 1440 350" stroke="white" strokeWidth="30" fill="none" />
        </svg>
        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <RevealOnView>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#14b8a6]">För hamnägare</p>
              <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
                Fyll varje
                <br />
                bryggplats
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-white/60">
                Anslut din hamn till Båtplats och nå båtägare som letar säsongsplats. Du bestämmer pris, villkor och
                tillgänglighet. Vi sköter resten.
              </p>
              <ul className="mt-8 space-y-3.5 text-[15px] text-white/80">
                {[
                  "Gratis att lista, du betalar bara vid bokad plats",
                  "Smidiga betalningsflöden",
                  "Verifiering och tydliga avtal",
                  "Översikt över bokningar i realtid",
                ].map((line) => (
                  <li key={line} className="flex items-center gap-3">
                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[rgba(13,148,136,0.4)] bg-[rgba(13,148,136,0.2)]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="#14b8a6"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                href="/for-hamnar"
                className="mt-10 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-[#0f1f3d] transition hover:-translate-y-0.5 hover:bg-[#f5f0e8]"
              >
                Läs mer för hamnar
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 8h10M9 5l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </RevealOnView>

            <RevealOnView delayClass="delay-150">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-7 backdrop-blur-md">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-lg font-bold text-white">Vasahamnen, Lidingö</span>
                  <span className="rounded-full border border-[rgba(13,148,136,0.3)] bg-[rgba(13,148,136,0.15)] px-2.5 py-1 text-[11px] font-semibold text-[#14b8a6]">
                    ● Aktiv
                  </span>
                </div>
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {[
                    ["24", "Totalt platser"],
                    ["21", "Bokade"],
                    ["87%", "Beläggning"],
                  ].map(([val, lab]) => (
                    <div key={lab} className="rounded-lg bg-white/[0.04] p-3.5">
                      <div className="text-[22px] font-bold tracking-[-0.03em] text-white">{val}</div>
                      <div className="text-[11px] text-white/40">{lab}</div>
                    </div>
                  ))}
                </div>
                <p className="mb-2.5 text-[11px] uppercase tracking-[0.06em] text-white/40">Bokningar per månad</p>
                <div className="mb-6 flex h-12 items-end gap-1.5">
                  {[24, 40, 48, 44, 28].map((h, j) => (
                    <div key={j} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm bg-[#0d9488]"
                        style={{
                          height: `${h}px`,
                          opacity: j === 2 ? 1 : 0.35 + j * 0.08,
                        }}
                      />
                      <span className="text-[9px] text-white/30">{["Maj", "Jun", "Jul", "Aug", "Sep"][j]}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[rgba(13,148,136,0.25)] bg-[rgba(13,148,136,0.12)] px-4 py-3.5">
                  <span className="text-sm text-white/60">Intäkt denna säsong</span>
                  <span className="text-2xl font-extrabold tracking-[-0.03em] text-[#14b8a6]">84 600 kr</span>
                </div>
              </div>
            </RevealOnView>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[#0d9488] px-4 py-14 sm:px-6 md:px-12 md:py-20">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          viewBox="0 0 1440 200"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path
            d="M0 60Q360 20 720 60Q1080 100 1440 60"
            stroke="white"
            strokeWidth="80"
            fill="none"
          />
        </svg>
        <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.04em] text-white">
              Redo att hitta
              <br />
              din plats?
            </h2>
            <p className="mt-2 max-w-lg text-base text-white/75">
              Sök bland {stats.listings}+ platser. Gratis att söka, boka när du hittat rätt.
            </p>
          </div>
          <Link
            href="/kajplatser"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-[#0d9488] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          >
            Hitta min båtplats →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#0f1f3d]">
          <p className="text-sm font-medium text-[#8a96a8]">Laddar...</p>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
