import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ error: "Adress saknas" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Geocoding API-nyckel saknas" }, { status: 500 });
  }

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(address)}&` +
    `components=country:SE&` +
    `key=${apiKey}`;

  const response = await fetch(url);
  const payload = (await response.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{ long_name: string; types: string[] }>;
    }>;
  };

  if (payload.status !== "OK" || !payload.results?.[0]?.geometry?.location) {
    return NextResponse.json({ error: "Plats kunde inte hittas" }, { status: 404 });
  }

  const location = payload.results[0].geometry.location;
  const components = payload.results[0].address_components ?? [];
  const cityComponent =
    components.find((c) => c.types.includes("postal_town")) ??
    components.find((c) => c.types.includes("locality")) ??
    components.find((c) => c.types.includes("administrative_area_level_1"));

  return NextResponse.json({
    lat: location.lat,
    lng: location.lng,
    city: cityComponent?.long_name ?? "",
    formatted_address: payload.results[0].formatted_address ?? address,
  });
}
