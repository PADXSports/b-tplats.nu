export type LatLng = {
  lat: number;
  lng: number;
};

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type GeoJsonGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

export type AreaBounds = {
  southwest: LatLng;
  northeast: LatLng;
};

export type AreaFilterMode = "polygon" | "broad";

export type AreaTag = {
  id: string;
  name: string;
  types: string[];
  label?: string;
  isCity: boolean;
  lat: number;
  lng: number;
  viewport: AreaBounds | null;
  polygon: GeoJsonGeometry | null;
};

export type SelectedArea = {
  name: string;
  place_id: string;
  lat: number;
  lng: number;
  label?: string;
  polygons: LatLng[][];
  geojson?: GeoJsonGeometry | null;
  googlePlaceTypes?: string[];
  nominatimType?: string | null;
  nominatimClass?: string | null;
  filterMode?: AreaFilterMode;
  bounds?: AreaBounds | null;
  drawPolygon?: boolean;
  isMunicipality?: boolean;
};

export type AreaSearchSuggestion = {
  name: string;
  fullName: string;
  label: string;
  place_id: string;
  lat: number;
  lng: number;
  type: string;
  class: string;
  boundingbox?: [string, string, string, string];
};

export type AreaPolygonOverlay = {
  paths?: LatLng[];
  geojson?: GeoJsonGeometry;
  bounds?: AreaBounds;
  drawPolygon?: boolean;
  isMunicipality?: boolean;
  name?: string;
};

export type AreaPolygonFetchResult = {
  geojson: GeoJsonGeometry | null;
  polygons: LatLng[][];
  nominatimType?: string | null;
  nominatimClass?: string | null;
  bounds?: AreaBounds | null;
};

const NEIGHBORHOOD_PLACE_TYPES = new Set(["suburb", "quarter", "neighbourhood", "neighborhood"]);
const GOOGLE_MUNICIPALITY_TYPES = new Set([
  "locality",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "municipality",
]);
const GOOGLE_STADSDEL_TYPES = new Set([
  "sublocality",
  "sublocality_level_1",
  "neighborhood",
  "quarter",
]);
const GOOGLE_BROAD_PLACE_TYPES = new Set([
  "locality",
  "administrative_area_level_1",
  "administrative_area_level_2",
]);
const LARGE_POLYGON_THRESHOLD_DEG = 0.1;
const SMALL_POLYGON_THRESHOLD_DEG = 0.05;
const CITY_PROXIMITY_FALLBACK_KM = 15;
const SMALL_POLYGON_BUFFER_KM = 5;

export type PolygonWithHoles = {
  outer: LatLng[];
  holes: LatLng[][];
};

type GeocodeGeometry = {
  location?: { lat: number; lng: number };
  viewport?: { northeast: LatLng; southwest: LatLng };
  bounds?: { northeast: LatLng; southwest: LatLng };
};

type GeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: GeocodeGeometry;
  }>;
};

type AreaPolygonApiResponse = {
  geojson?: GeoJsonGeometry | null;
  geometry?: GeoJsonGeometry | null;
  lat?: number | null;
  lng?: number | null;
  display_name?: string | null;
  displayName?: string | null;
  type?: string | null;
  class?: string | null;
  boundingbox?: [string, string, string, string];
  error?: string;
  fallback?: boolean;
};

export function ringCoordsToLatLng(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

export function simplifyRing(ring: number[][], maxPoints = 300): number[][] {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ring;

  const step = Math.ceil(ring.length / maxPoints);
  const simplified = ring.filter((_, index) => index % step === 0);

  if (simplified.length > 0) {
    const first = ring[0];
    const last = simplified[simplified.length - 1];
    if (last[0] !== first[0] || last[1] !== first[1]) {
      simplified.push(first);
    }
  }

  return simplified;
}

/** @alias simplifyRing */
export function simplifyPolygonRing(coords: number[][], maxPoints = 500): number[][] {
  return simplifyRing(coords, maxPoints);
}

export function simplifyGeoJsonGeometry(geometry: GeoJsonGeometry, maxPoints = 300): GeoJsonGeometry {
  if (!geometry) return geometry;

  if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) {
    console.error("Invalid geometry:", geometry);
    return geometry;
  }

  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) =>
        Array.isArray(ring) ? simplifyRing(ring, maxPoints) : ring,
      ),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        Array.isArray(polygon)
          ? polygon.map((ring) =>
              Array.isArray(ring) && Array.isArray(ring[0]) ? simplifyRing(ring, maxPoints) : ring,
            )
          : polygon,
      ),
    };
  }

  return geometry;
}

export function geoJsonGeometryToPolygons(geometry: GeoJsonGeometry | null | undefined): PolygonWithHoles[] {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates;
    if (!outer?.length) return [];
    return [
      {
        outer: ringCoordsToLatLng(outer),
        holes: holes.map((hole: number[][]) => ringCoordsToLatLng(hole)),
      },
    ];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((polygonCoords: number[][][]) => {
        const [outer, ...holes] = polygonCoords;
        if (!outer?.length) return null;
        return {
          outer: ringCoordsToLatLng(outer),
          holes: holes.map((hole: number[][]) => ringCoordsToLatLng(hole)),
        };
      })
      .filter((polygon): polygon is PolygonWithHoles => polygon != null);
  }

  return [];
}

export function geoJsonGeometryToRings(geometry: GeoJsonGeometry | null | undefined): LatLng[][] {
  return geoJsonGeometryToPolygons(geometry).flatMap((polygon) => [polygon.outer, ...polygon.holes]);
}

export function boundsToPolygon(bounds: { northeast: LatLng; southwest: LatLng }): LatLng[] {
  const ne = bounds.northeast;
  const sw = bounds.southwest;
  return [
    { lat: sw.lat, lng: sw.lng },
    { lat: ne.lat, lng: sw.lng },
    { lat: ne.lat, lng: ne.lng },
    { lat: sw.lat, lng: ne.lng },
  ];
}

export function geometryToPolygons(geometry: GeocodeGeometry | undefined): LatLng[][] {
  if (!geometry) return [];
  const box = geometry.bounds ?? geometry.viewport;
  if (box) return [boundsToPolygon(box)];
  if (geometry.location) {
    const { lat, lng } = geometry.location;
    const delta = 0.02;
    return [
      [
        { lat: lat - delta, lng: lng - delta },
        { lat: lat + delta, lng: lng - delta },
        { lat: lat + delta, lng: lng + delta },
        { lat: lat - delta, lng: lng + delta },
      ],
    ];
  }
  return [];
}

export function extractShortPlaceName(name: string | undefined | null): string {
  if (!name?.trim()) return "Område";
  const shortName = name.split(",")[0]?.trim();
  return shortName || name.trim();
}

export function inferNominatimCity(lat: number, lng: number): string | undefined {
  if (lat >= 59.1 && lat <= 59.5 && lng >= 17.8 && lng <= 18.4) return "Stockholm";
  if (lat >= 57.6 && lat <= 57.8 && lng >= 11.8 && lng <= 12.1) return "Göteborg";
  if (lat >= 55.5 && lat <= 55.7 && lng >= 12.9 && lng <= 13.1) return "Malmö";
  return undefined;
}

export function nominatimBoundingBoxToBounds(bbox: [string, string, string, string]): AreaBounds {
  const [south, north, west, east] = bbox.map(Number);
  return {
    southwest: { lat: south, lng: west },
    northeast: { lat: north, lng: east },
  };
}

export function formatAreaSuggestionLabel(
  name: string,
  type?: string | null,
  placeClass?: string | null,
  fullName?: string | null,
): string {
  const display = fullName ?? name;
  if (display.includes("län") || type === "county") return `${name} · Län`;
  if (display.includes("kommun") || type === "municipality") return `${name} · Kommun`;
  if (type === "suburb" || type === "neighbourhood" || type === "neighborhood" || type === "quarter") {
    return `${name} · Stadsdel`;
  }
  if (type === "city" || placeClass === "place") return `${name} · Stad`;
  return `${name} · Område`;
}

export function nominatimTypesToGooglePlaceTypes(
  type?: string | null,
  placeClass?: string | null,
  displayName?: string | null,
): string[] {
  const types: string[] = [];
  const display = displayName ?? "";

  if (display.includes("län") || type === "county") {
    types.push("administrative_area_level_1");
  }
  if (type === "city" || type === "municipality" || display.includes("kommun")) {
    types.push("locality");
  }
  if (
    type === "suburb" ||
    type === "neighbourhood" ||
    type === "neighborhood" ||
    type === "quarter"
  ) {
    types.push("neighborhood");
  }
  if (type === "administrative" && placeClass === "boundary" && !display.includes("län")) {
    types.push("administrative_area_level_2");
  }

  return types;
}

type NominatimSearchResult = {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  class?: string;
  boundingbox?: [string, string, string, string];
};

export function mapNominatimSearchResult(result: NominatimSearchResult): AreaSearchSuggestion | null {
  if (result.place_id == null || !result.lat || !result.lon || !result.display_name) return null;

  const name = extractShortPlaceName(result.display_name);
  const type = result.type ?? "";
  const placeClass = result.class ?? "";

  return {
    name,
    fullName: result.display_name,
    label: formatAreaSuggestionLabel(name, type, placeClass, result.display_name),
    place_id: String(result.place_id),
    lat: Number.parseFloat(result.lat),
    lng: Number.parseFloat(result.lon),
    type,
    class: placeClass,
    boundingbox: result.boundingbox,
  };
}

export function geoJsonGeometryToBounds(geometry: GeoJsonGeometry): AreaBounds {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  const processRing = (ring: number[][]) => {
    ring.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  };

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(processRing);
  } else {
    geometry.coordinates.forEach((polygon) => polygon.forEach(processRing));
  }

  return {
    southwest: { lat: minLat, lng: minLng },
    northeast: { lat: maxLat, lng: maxLng },
  };
}

export function isStadsdelFromGoogleTypes(types?: string[] | null): boolean {
  if (!types?.length) return false;
  return types.some((type) => GOOGLE_STADSDEL_TYPES.has(type) || type === "sublocality_level_2");
}

export function isMunicipalityFromGoogleTypes(types?: string[] | null): boolean {
  if (!types?.length) return false;
  if (isStadsdelFromGoogleTypes(types)) return false;
  return types.some((type) => GOOGLE_MUNICIPALITY_TYPES.has(type));
}

export function isMunicipalityArea(
  googleTypes?: string[] | null,
  nominatimType?: string | null,
  nominatimClass?: string | null,
): boolean {
  if (isMunicipalityFromGoogleTypes(googleTypes)) return true;
  if (isStadsdelFromGoogleTypes(googleTypes)) return false;
  if (nominatimType === "city" || nominatimType === "municipality" || nominatimType === "county") {
    return true;
  }
  if (nominatimType === "administrative" && nominatimClass === "boundary") {
    return true;
  }
  return false;
}

export function isBroadAreaFromGoogleTypes(types?: string[] | null): boolean {
  if (!types?.length) return false;
  if (types.some((type) => GOOGLE_STADSDEL_TYPES.has(type) || type === "sublocality_level_2")) return false;
  if (types.some((type) => GOOGLE_BROAD_PLACE_TYPES.has(type))) return true;
  return types.includes("political");
}

export function googlePlaceGeometryToBounds(geometry?: {
  bounds?: {
    southwest: { lat: () => number; lng: () => number };
    northeast: { lat: () => number; lng: () => number };
  };
  viewport?: {
    southwest: { lat: () => number; lng: () => number };
    northeast: { lat: () => number; lng: () => number };
  };
  location?: { lat: () => number; lng: () => number };
}): AreaBounds | null {
  if (!geometry || !geometry.location) {
    console.error("googlePlaceGeometryToBounds: geometry is undefined");
    return null;
  }

  const box = geometry.bounds ?? geometry.viewport;
  if (box?.southwest && box?.northeast) {
    return {
      southwest: { lat: box.southwest.lat(), lng: box.southwest.lng() },
      northeast: { lat: box.northeast.lat(), lng: box.northeast.lng() },
    };
  }

  const lat = geometry.location.lat();
  const lng = geometry.location.lng();
  const delta = 0.05;
  return {
    southwest: { lat: lat - delta, lng: lng - delta },
    northeast: { lat: lat + delta, lng: lng + delta },
  };
}

export function createOptimisticSelectedArea(
  selection: {
    name: string;
    place_id: string;
    lat: number;
    lng: number;
    label?: string;
    googlePlaceTypes?: string[];
    nominatimType?: string | null;
    nominatimClass?: string | null;
    bounds?: AreaBounds | null;
  },
): SelectedArea {
  const shortName = extractShortPlaceName(selection.name);
  const nominatimType = selection.nominatimType ?? null;
  const nominatimClass = selection.nominatimClass ?? null;
  const googlePlaceTypes =
    selection.googlePlaceTypes ??
    nominatimTypesToGooglePlaceTypes(nominatimType, nominatimClass, selection.name);
  const filterMode: AreaFilterMode =
    isMunicipalityArea(googlePlaceTypes, nominatimType, nominatimClass) ||
    isBroadAreaFromGoogleTypes(googlePlaceTypes)
      ? "broad"
      : "polygon";

  return {
    name: shortName,
    place_id: selection.place_id,
    lat: selection.lat,
    lng: selection.lng,
    label: selection.label ?? formatAreaSuggestionLabel(shortName, nominatimType, nominatimClass, selection.name),
    googlePlaceTypes,
    nominatimType,
    nominatimClass,
    polygons: [],
    geojson: null,
    filterMode,
    bounds: selection.bounds ?? null,
    drawPolygon: false,
    isMunicipality: isMunicipalityArea(googlePlaceTypes, nominatimType, nominatimClass),
  };
}

export function isBroadAreaPlace(
  type?: string | null,
  placeClass?: string | null,
  geometry?: GeoJsonGeometry | null,
): boolean {
  return resolveAreaFilterMode(type, placeClass, geometry) === "broad";
}

export function resolveAreaFilterMode(
  type?: string | null,
  placeClass?: string | null,
  geometry?: GeoJsonGeometry | null,
): AreaFilterMode {
  if (type && NEIGHBORHOOD_PLACE_TYPES.has(type)) return "polygon";

  const isLarge = geometry ? isPolygonTooLargeForDrawing(geometry) : false;

  if (type === "city" || type === "municipality" || type === "county") return "broad";

  if (type === "administrative" || (placeClass === "boundary" && type === "administrative")) {
    return isLarge ? "broad" : "polygon";
  }

  return isLarge ? "broad" : "polygon";
}

export function isPolygonTooLargeForDrawing(
  geometry: GeoJsonGeometry,
  thresholdDeg = LARGE_POLYGON_THRESHOLD_DEG,
): boolean {
  const { southwest, northeast } = geoJsonGeometryToBounds(geometry);
  const latSpan = northeast.lat - southwest.lat;
  const lngSpan = northeast.lng - southwest.lng;
  return latSpan > thresholdDeg || lngSpan > thresholdDeg;
}

export function isSmallAreaPolygon(
  geometry: GeoJsonGeometry,
  thresholdDeg = SMALL_POLYGON_THRESHOLD_DEG,
): boolean {
  const { southwest, northeast } = geoJsonGeometryToBounds(geometry);
  const latSpan = northeast.lat - southwest.lat;
  const lngSpan = northeast.lng - southwest.lng;
  return latSpan < thresholdDeg && lngSpan < thresholdDeg;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizePlaceNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+kommun$/i, "")
    .replace(/\s+(stad|city)$/i, "")
    .trim();
}

export function cityMatchesPlaceName(listingCity: string | null | undefined, placeName: string): boolean {
  if (!listingCity?.trim()) return false;
  const city = normalizePlaceNameForMatch(listingCity);
  const place = normalizePlaceNameForMatch(placeName);
  if (!city || !place) return false;
  return city === place || city.startsWith(place) || place.startsWith(city);
}

export function pointInBounds(point: LatLng, bounds: AreaBounds): boolean {
  return (
    point.lat >= bounds.southwest.lat &&
    point.lat <= bounds.northeast.lat &&
    point.lng >= bounds.southwest.lng &&
    point.lng <= bounds.northeast.lng
  );
}

export function buildSelectedAreaFromFetch(
  base: {
    name: string;
    place_id: string;
    lat: number;
    lng: number;
    label?: string;
    googlePlaceTypes?: string[];
    nominatimType?: string | null;
    nominatimClass?: string | null;
    bounds?: AreaBounds | null;
  },
  fetch: AreaPolygonFetchResult,
): SelectedArea {
  const isMunicipality = isMunicipalityArea(
    base.googlePlaceTypes,
    fetch.nominatimType ?? base.nominatimType,
    fetch.nominatimClass ?? base.nominatimClass,
  );
  const filterMode: AreaFilterMode =
    isMunicipality || isBroadAreaFromGoogleTypes(base.googlePlaceTypes)
      ? "broad"
      : resolveAreaFilterMode(fetch.nominatimType, fetch.nominatimClass, fetch.geojson);
  const bounds =
    base.bounds ?? fetch.bounds ?? (fetch.geojson ? geoJsonGeometryToBounds(fetch.geojson) : null);
  const drawPolygon =
    Boolean(fetch.geojson) &&
    (isMunicipality || !isPolygonTooLargeForDrawing(fetch.geojson!));
  const shortName = extractShortPlaceName(base.name);
  const nominatimType = fetch.nominatimType ?? base.nominatimType ?? null;
  const nominatimClass = fetch.nominatimClass ?? base.nominatimClass ?? null;

  return {
    name: shortName,
    place_id: base.place_id,
    lat: base.lat,
    lng: base.lng,
    label:
      base.label ?? formatAreaSuggestionLabel(shortName, nominatimType, nominatimClass, base.name),
    googlePlaceTypes: base.googlePlaceTypes,
    geojson: fetch.geojson,
    polygons: fetch.polygons,
    nominatimType,
    nominatimClass,
    filterMode,
    bounds,
    drawPolygon,
    isMunicipality,
  };
}

async function fetchAreaPolygonFromApi(params: URLSearchParams): Promise<AreaPolygonFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`/api/area-polygon?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const payload = (await response.json()) as AreaPolygonApiResponse;
    const geojson = payload.geojson ?? payload.geometry ?? null;
    const boundsFromPayload = payload.boundingbox
      ? nominatimBoundingBoxToBounds(payload.boundingbox)
      : null;

    if (!response.ok || !geojson) {
      console.warn("Nominatim returned no polygon, falling back to bounds zoom");
      return {
        geojson: null,
        polygons: [],
        nominatimType: payload.type ?? null,
        nominatimClass: payload.class ?? null,
        bounds: boundsFromPayload,
      };
    }

    const simplifiedGeometry = simplifyGeoJsonGeometry(geojson);
    const polygons = geoJsonGeometryToRings(simplifiedGeometry);
    const bounds = boundsFromPayload ?? geoJsonGeometryToBounds(simplifiedGeometry);

    return {
      geojson: simplifiedGeometry,
      polygons,
      nominatimType: payload.type ?? null,
      nominatimClass: payload.class ?? null,
      bounds,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Nominatim timeout, falling back to bounds zoom", error);
    return { geojson: null, polygons: [] };
  }
}

export async function fetchAreaPolygonByPlaceId(placeId: string): Promise<AreaPolygonFetchResult> {
  const params = new URLSearchParams({ place_id: placeId });
  return fetchAreaPolygonFromApi(params);
}

export async function fetchAreaPolygonByName(
  name: string,
  options?: { city?: string; countrycodes?: string },
): Promise<AreaPolygonFetchResult> {
  const placeName = extractShortPlaceName(name);
  console.log("Fetching polygon for:", placeName);

  const params = new URLSearchParams({
    name: placeName,
    countrycodes: options?.countrycodes ?? "se",
  });
  if (options?.city) params.set("city", options.city);

  return fetchAreaPolygonFromApi(params);
}

/** @alias fetchAreaPolygonByName */
export const fetchPolygon = fetchAreaPolygonByName;

export async function fetchPlacePolygons(placeId: string, apiKey: string): Promise<LatLng[][]> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `place_id=${encodeURIComponent(placeId)}&` +
    `key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  const payload = (await response.json()) as GeocodeResponse;

  if (payload.status !== "OK" || !payload.results?.length) {
    return [];
  }

  const polygons: LatLng[][] = [];
  for (const result of payload.results) {
    polygons.push(...geometryToPolygons(result.geometry));
  }

  return polygons;
}

export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInPolygonWithHoles(point: LatLng, polygon: PolygonWithHoles): boolean {
  if (!pointInPolygon(point, polygon.outer)) return false;
  return !polygon.holes.some((hole) => pointInPolygon(point, hole));
}

export function pointInGeoJsonGeometry(point: LatLng, geometry: GeoJsonGeometry): boolean {
  return geoJsonGeometryToPolygons(geometry).some((polygon) => pointInPolygonWithHoles(point, polygon));
}

export function pointInSelectedAreas(point: LatLng, areas: SelectedArea[]): boolean {
  if (areas.length === 0) return true;

  return areas.some((area) => {
    if (area.filterMode === "broad") {
      if (area.bounds && pointInBounds(point, area.bounds)) return true;
      return area.polygons.some((ring) => pointInPolygon(point, ring));
    }
    if (area.geojson) return pointInGeoJsonGeometry(point, area.geojson);
    return area.polygons.some((ring) => pointInPolygon(point, ring));
  });
}

export function listingMatchesSelectedArea(
  listing: { lat: number | null; lng: number | null; city: string | null },
  area: SelectedArea,
): boolean {
  const lat = Number(listing.lat);
  const lng = Number(listing.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  if (area.filterMode === "broad") {
    if (cityMatchesPlaceName(listing.city, area.name)) return true;
    if (area.bounds) return pointInBounds({ lat, lng }, area.bounds);
    return false;
  }

  if (!area.geojson && area.isMunicipality) {
    if (cityMatchesPlaceName(listing.city, area.name)) return true;
    if (area.bounds) return pointInBounds({ lat, lng }, area.bounds);
    return false;
  }

  if (area.geojson) return pointInGeoJsonGeometry({ lat, lng }, area.geojson);
  return area.polygons.some((ring) => pointInPolygon({ lat, lng }, ring));
}

export function listingMatchesSelectedAreas(
  listing: { lat: number | null; lng: number | null; city: string | null },
  areas: SelectedArea[],
): boolean {
  if (areas.length === 0) return true;
  return areas.some((area) => listingMatchesSelectedArea(listing, area));
}

export function extendBoundsFromAreaBounds(
  bounds: { extend: (point: LatLng) => void },
  areaBounds: AreaBounds,
): void {
  bounds.extend(areaBounds.southwest);
  bounds.extend(areaBounds.northeast);
}

export function extendBoundsFromGeoJson(
  bounds: { extend: (point: LatLng) => void },
  geometry: GeoJsonGeometry,
): void {
  const extendRing = (ring: number[][]) => {
    ring.forEach(([lng, lat]) => bounds.extend({ lat, lng }));
  };

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(extendRing);
    return;
  }

  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon: number[][][]) => polygon.forEach(extendRing));
  }
}

export function isCityFromGoogleTypes(types?: string[] | null): boolean {
  if (!types?.length) return false;
  return types.some((type) =>
    [
      "locality",
      "administrative_area_level_1",
      "administrative_area_level_2",
      "administrative_area_level_3",
      "political",
    ].includes(type),
  );
}

export function getAreaLabel(types: string[]): string {
  if (
    types.includes("sublocality") ||
    types.includes("sublocality_level_1") ||
    types.includes("neighborhood") ||
    types.includes("quarter")
  ) {
    return "Stadsdel";
  }
  if (types.includes("locality")) {
    return "Stad";
  }
  if (types.includes("administrative_area_level_1")) {
    return "Län";
  }
  if (types.includes("administrative_area_level_2") || types.includes("administrative_area_level_3")) {
    return "Kommun";
  }
  if (types.includes("natural_feature") || types.includes("archipelago")) {
    return "Område";
  }
  return "Område";
}

export function normalizeTagNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(" stad", "")
    .replace(" kommun", "")
    .replace("s län", "")
    .replace(" län", "")
    .trim();
}

export type ListingForCityMatch = {
  city?: string | null;
  address?: string | null;
  harbour_name?: string | null;
  title?: string | null;
};

export type ListingForAreaMatch = ListingForCityMatch & {
  lat: number | null;
  lng: number | null;
  city: string | null;
};

export type AreaTagMatchOptions = {
  proximityFallbackTagIds?: Set<string>;
  allListings?: ListingForAreaMatch[];
};

export function listingMatchesCityTag(listing: ListingForCityMatch, tagName: string): boolean {
  const tag = normalizeTagNameForMatch(tagName);
  if (!tag) return false;

  const city = normalizeTagNameForMatch(listing.city || "");
  const address = (listing.address || "").toLowerCase();
  const harbour = (listing.harbour_name || "").toLowerCase();
  const title = (listing.title || "").toLowerCase();

  return (
    (city.length > 0 && (city.includes(tag) || tag.includes(city))) ||
    address.includes(tag) ||
    harbour.includes(tag) ||
    title.includes(tag)
  );
}

export function getProximityFallbackTagIds(
  allListings: ListingForAreaMatch[],
  tags: AreaTag[],
): Set<string> {
  const ids = new Set<string>();
  for (const tag of tags) {
    if (!tag.isCity) continue;
    const cityMatchCount = allListings.filter((listing) => listingMatchesCityTag(listing, tag.name)).length;
    if (cityMatchCount === 0) {
      ids.add(tag.id);
    }
  }
  return ids;
}

export function listingMatchesAreaTag(
  listing: ListingForAreaMatch,
  tag: AreaTag,
  options?: AreaTagMatchOptions,
): boolean {
  const proximityFallbackTagIds =
    options?.proximityFallbackTagIds ??
    (options?.allListings ? getProximityFallbackTagIds(options.allListings, [tag]) : new Set<string>());

  if (tag.isCity) {
    if (listingMatchesCityTag(listing, tag.name)) return true;
    if (!proximityFallbackTagIds.has(tag.id)) return false;

    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (!Number.isFinite(tag.lat) || !Number.isFinite(tag.lng)) return false;
    return haversineDistance(tag.lat, tag.lng, lat, lng) <= CITY_PROXIMITY_FALLBACK_KM;
  }

  const lat = Number(listing.lat);
  const lng = Number(listing.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  if (tag.polygon) {
    const inPolygon = pointInGeoJsonGeometry({ lat, lng }, tag.polygon);
    if (inPolygon) return true;

    if (
      isSmallAreaPolygon(tag.polygon) &&
      Number.isFinite(tag.lat) &&
      Number.isFinite(tag.lng)
    ) {
      return haversineDistance(tag.lat, tag.lng, lat, lng) <= SMALL_POLYGON_BUFFER_KM;
    }

    return false;
  }

  if (tag.viewport) {
    return pointInBounds({ lat, lng }, tag.viewport);
  }

  return false;
}

/** @alias listingMatchesAreaTag */
export const listingMatchesTag = listingMatchesAreaTag;

export function listingMatchesAreaTags(
  listing: ListingForAreaMatch,
  tags: AreaTag[],
  options?: AreaTagMatchOptions,
): boolean {
  if (tags.length === 0) return true;

  const proximityFallbackTagIds =
    options?.proximityFallbackTagIds ??
    (options?.allListings ? getProximityFallbackTagIds(options.allListings, tags) : new Set<string>());
  const matchOptions: AreaTagMatchOptions = { proximityFallbackTagIds };

  const matchesAnyArea = tags.some((tag) => listingMatchesAreaTag(listing, tag, matchOptions));
  if (matchesAnyArea) return true;

  // Multi-area fallback: include listings within combined selected-area bounds.
  // This avoids dropping listings that are between adjacent selected stadsdelar.
  if (tags.length < 2) return false;

  const lat = Number(listing.lat);
  const lng = Number(listing.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let hasAnyBounds = false;

  tags.forEach((tag) => {
    if (tag.viewport) {
      minLat = Math.min(minLat, tag.viewport.southwest.lat);
      maxLat = Math.max(maxLat, tag.viewport.northeast.lat);
      minLng = Math.min(minLng, tag.viewport.southwest.lng);
      maxLng = Math.max(maxLng, tag.viewport.northeast.lng);
      hasAnyBounds = true;
      return;
    }

    if (tag.polygon) {
      const polygonBounds = geoJsonGeometryToBounds(tag.polygon);
      minLat = Math.min(minLat, polygonBounds.southwest.lat);
      maxLat = Math.max(maxLat, polygonBounds.northeast.lat);
      minLng = Math.min(minLng, polygonBounds.southwest.lng);
      maxLng = Math.max(maxLng, polygonBounds.northeast.lng);
      hasAnyBounds = true;
      return;
    }

    if (Number.isFinite(tag.lat) && Number.isFinite(tag.lng)) {
      minLat = Math.min(minLat, tag.lat - 0.05);
      maxLat = Math.max(maxLat, tag.lat + 0.05);
      minLng = Math.min(minLng, tag.lng - 0.05);
      maxLng = Math.max(maxLng, tag.lng + 0.05);
      hasAnyBounds = true;
    }
  });

  if (!hasAnyBounds) return false;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

export function areaTagsToParam(tags: AreaTag[]): string {
  return encodeURIComponent(
    JSON.stringify(
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        types: tag.types,
        label: tag.label ?? getAreaLabel(tag.types),
        isCity: tag.isCity,
        lat: tag.lat,
        lng: tag.lng,
        viewport: tag.viewport,
      })),
    ),
  );
}

export function parseAreaTagsParam(value: string | null): AreaTag[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Array<{
      id?: string;
      place_id?: string;
      name?: string;
      types?: string[];
      label?: string;
      googlePlaceTypes?: string[];
      isCity?: boolean;
      lat?: number;
      lng?: number;
      viewport?: AreaBounds | null;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item.name)
      .map((item) => {
        const types = Array.isArray(item.types)
          ? item.types
          : Array.isArray(item.googlePlaceTypes)
            ? item.googlePlaceTypes
            : [];
        return {
          id: String(item.id ?? item.place_id ?? `${item.name}-${item.lat}-${item.lng}`),
          name: String(item.name),
          types,
          label: item.label ?? getAreaLabel(types),
          isCity: item.isCity ?? isCityFromGoogleTypes(types),
          lat: Number(item.lat) || 0,
          lng: Number(item.lng) || 0,
          viewport: item.viewport ?? null,
          polygon: null,
        };
      });
  } catch {
    return [];
  }
}

export function formatAreaResultCount(
  count: number,
  areas: Array<{ name: string }>,
  options?: { useProximityLabel?: boolean },
): string {
  const label = count === 1 ? "båtplats" : "båtplatser";
  if (areas.length === 0) return `${count} ${label} tillgängliga`;
  if (areas.length === 1) {
    const prep = options?.useProximityLabel ? "nära" : "i";
    return `${count} ${label} ${prep} ${areas[0].name}`;
  }
  const names = areas.map((area) => area.name).join(", ");
  return `${count} ${label} i ${names}`;
}

export function formatAreaNamesList(areas: Array<{ name: string }>): string {
  if (areas.length === 0) return "valda områden";
  if (areas.length === 1) return areas[0].name;
  return areas.map((area) => area.name).join(", ");
}

export function selectedAreasToParam(areas: SelectedArea[]): string {
  return encodeURIComponent(
    JSON.stringify(
      areas.map((area) => ({
        name: area.name,
        place_id: area.place_id,
        lat: area.lat,
        lng: area.lng,
        label: area.label,
        googlePlaceTypes: area.googlePlaceTypes,
        nominatimType: area.nominatimType,
        nominatimClass: area.nominatimClass,
      })),
    ),
  );
}

export function parseAreasParam(
  value: string | null,
): Array<
  Pick<
    SelectedArea,
    "name" | "place_id" | "lat" | "lng" | "label" | "googlePlaceTypes" | "nominatimType" | "nominatimClass"
  >
> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Array<{
      name?: string;
      place_id?: string;
      lat?: number;
      lng?: number;
      label?: string;
      googlePlaceTypes?: string[];
      nominatimType?: string | null;
      nominatimClass?: string | null;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item.place_id && item.name)
      .map((item) => ({
        name: String(item.name),
        place_id: String(item.place_id),
        lat: Number(item.lat) || 0,
        lng: Number(item.lng) || 0,
        label: item.label ? String(item.label) : undefined,
        googlePlaceTypes: Array.isArray(item.googlePlaceTypes) ? item.googlePlaceTypes : undefined,
        nominatimType: item.nominatimType ?? undefined,
        nominatimClass: item.nominatimClass ?? undefined,
      }));
  } catch {
    return [];
  }
}
