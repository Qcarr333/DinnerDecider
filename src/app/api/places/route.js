import { NextResponse } from "next/server";

import { internalFetchNearbyRestaurants } from "@/lib/fetchNearbyRestaurants";

const DEFAULT_ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_DEV_ORIGIN || "http://localhost:3003";

function withCors(response, origin) {
  const allowedOrigin = origin || DEFAULT_ALLOWED_ORIGIN;
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function OPTIONS(request) {
  return withCors(new NextResponse(null, { status: 204 }), request.headers.get("origin"));
}

export async function POST(request) {
  const startedAt = Date.now();
  const origin = request.headers.get("origin") || undefined;
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    console.warn("[/api/places] Failed to parse JSON payload", error);
    return withCors(NextResponse.json({ error: "invalid_json" }, { status: 400 }), origin);
  }

  const { lat, lng, filters = {}, selectedCombo = null, signals = {} } = payload || {};

  if (typeof lat !== "number" || typeof lng !== "number") {
    console.warn("[/api/places] Missing or invalid coordinates", { lat, lng });
    return withCors(NextResponse.json({ error: "invalid_coordinates" }, { status: 422 }), origin);
  }

  try {
    console.log("🛰️ [/api/places] Proxying Places request", {
      lat,
      lng,
      hasFilters: filters ? Object.keys(filters).length > 0 : false,
      hasCombo: !!selectedCombo,
      signals,
    });

    const { results, meta } = await internalFetchNearbyRestaurants(lat, lng, filters, selectedCombo, signals);
    const durationMs = Date.now() - startedAt;

    const response = NextResponse.json({
      results,
      meta,
      durationMs,
    });

    response.headers.set("X-Duration-Ms", String(durationMs));

    return withCors(response, origin);
  } catch (error) {
    console.error("[/api/places] Upstream failure", error);
    return withCors(
      NextResponse.json(
        {
          error: "places_proxy_failed",
          message: error?.message || "Unknown error",
        },
        { status: 502 }
      ),
      origin
    );
  }
}
