import { NextRequest, NextResponse } from "next/server";

import type { GeoJsonGeometry } from "@/lib/area-search";

type NominatimResult = {
  geojson?: GeoJsonGeometry;
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  class?: string;
};

function hasPolygon(geojson?: GeoJsonGeometry | null): boolean {
  if (!geojson) return false;
  if (geojson.type !== "Polygon" && geojson.type !== "MultiPolygon") return false;
  return Array.isArray(geojson.coordinates) && geojson.coordinates.length > 0;
}

/** Exclude county/län results (e.g. "Stockholms län") but keep municipalities like "Stockholms kommun". */
function isCountyOnlyResult(result: NominatimResult): boolean {
  const primary = result.display_name?.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.endsWith(" län") || primary.endsWith(" county");
}

function pickBestNominatimResult(data: NominatimResult[], queryName?: string): NominatimResult | undefined {
  if (!data.length) return undefined;

  if (queryName?.toLowerCase() === "stockholm") {
    console.log(
      "All Nominatim results for Stockholm:",
      data.map(
        (r) =>
          `${r.display_name} | type:${r.type} | class:${r.class} | geo:${r.geojson?.type ?? "none"}`,
      ),
    );
  }

  const filtered = data.filter((result) => !isCountyOnlyResult(result));
  const withPolygon = filtered.filter((result) => hasPolygon(result.geojson));

  return (
    withPolygon.find((result) => result.type === "administrative" && result.class === "boundary") ??
    withPolygon.find((result) => result.type === "city") ??
    withPolygon[0] ??
    filtered.find((result) => result.type === "city") ??
    filtered.find((result) => result.type === "administrative" && result.class === "boundary") ??
    filtered[0] ??
    data[0]
  );
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ error: "Namn saknas" }, { status: 400 });
  }

  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: `${name}, Sverige`,
      countrycodes: "se",
      polygon_geojson: "1",
      polygon_threshold: "0.005",
      format: "json",
      limit: "10",
      addressdetails: "1",
    }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Batplats.nu/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Kunde inte hämta områdesgräns" }, { status: response.status });
    }

    const data = (await response.json()) as NominatimResult[];
    const best = pickBestNominatimResult(data, name);

    if (!best) {
      return NextResponse.json({ error: "Ingen polygon hittades för området" }, { status: 404 });
    }

    return NextResponse.json({
      geojson: hasPolygon(best.geojson) ? best.geojson : null,
      type: best.type ?? null,
      displayName: best.display_name ?? name,
    });
  } catch (error) {
    clearTimeout(timeout);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { geojson: null, error: isTimeout ? "Nominatim timeout" : "Kunde inte ansluta till Nominatim" },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
