import { NextRequest, NextResponse } from "next/server";

import { mapNominatimSearchResult } from "@/lib/area-search";

type NominatimSearchResult = {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  class?: string;
  boundingbox?: [string, string, string, string];
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(`${query}, Sverige`)}&` +
    `countrycodes=se&` +
    `format=json&` +
    `limit=8&` +
    `addressdetails=1&` +
    `polygon_geojson=0`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Batplats.nu/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Kunde inte söka områden" }, { status: response.status });
    }

    const results = (await response.json()) as NominatimSearchResult[];
    const suggestions = results
      .map((result) => mapNominatimSearchResult(result))
      .filter((item): item is NonNullable<typeof item> => item != null);

    return NextResponse.json(suggestions);
  } catch (error) {
    clearTimeout(timeout);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "Sökningen tog för lång tid" : "Kunde inte ansluta till Nominatim" },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
