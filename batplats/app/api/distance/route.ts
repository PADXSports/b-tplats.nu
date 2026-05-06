import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const origins = searchParams.get("origins");
  const destinations = searchParams.get("destinations");

  if (!origins || !destinations) {
    return NextResponse.json({ error: "Missing origins or destinations" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing Google Maps API key" }, { status: 500 });
  }

  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${encodeURIComponent(origins)}&` +
    `destinations=${encodeURIComponent(destinations)}&` +
    `mode=driving&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Distance Matrix API error:", error);
    return NextResponse.json({ error: "Failed to fetch distance" }, { status: 500 });
  }
}
