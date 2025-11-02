import { NextResponse } from "next/server";

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function resolveBucket(tempC, condition, humidity) {
  const normalized = (condition || "").toLowerCase();
  if (normalized.includes("rain") || normalized.includes("storm") || normalized.includes("drizzle")) return "rain";
  if (typeof tempC === "number" && tempC <= 7) return "cold";
  if (typeof tempC === "number" && tempC >= 32) return "hot";
  if (typeof tempC === "number" && typeof humidity === "number" && tempC >= 26 && humidity >= 70) return "humid";
  return null;
}

function resolveHint(condition) {
  const normalized = (condition || "").toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("rain")) return "rainy";
  if (normalized.includes("snow")) return "snowy";
  if (normalized.includes("cloud")) return "cloudy";
  if (normalized.includes("storm")) return "stormy";
  if (normalized.includes("drizzle")) return "drizzly";
  if (normalized.includes("mist")) return "misty";
  if (normalized.includes("clear")) return "clear";
  if (normalized.includes("sun")) return "sunny";
  return normalized.split(" ")[0];
}

export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const roundedKey = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const now = Date.now();
  const cached = cache.get(roundedKey);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json({ ...cached.payload, cached: true });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const fallback = {
      bucket: null,
      condition: "Unknown",
      temperatureC: null,
      temperatureF: null,
      humidity: null,
      weatherHint: null,
      source: "missing_key",
    };
    return NextResponse.json(fallback, { status: 200 });
  }

  const endpoint = new URL("https://api.openweathermap.org/data/2.5/weather");
  endpoint.searchParams.set("lat", String(lat));
  endpoint.searchParams.set("lon", String(lng));
  endpoint.searchParams.set("appid", apiKey);
  endpoint.searchParams.set("units", "metric");

  try {
    const requestUrl = endpoint.toString();
    const startedAt = Date.now();

    console.log("🌦️ [API CALL]", {
      endpoint: requestUrl,
      lat,
      lng,
    });

    const res = await fetch(requestUrl, { cache: "no-store" });
    const durationMs = Date.now() - startedAt;

    if (res.status === 401) {
      console.warn("🌧️ [API RESPONSE]", { status: res.status, ok: false, durationMs });
      return NextResponse.json({ error: "weather_unauthorized", message: "OpenWeather API key rejected" }, { status: 401 });
    }
    if (!res.ok) {
      console.warn("🌧️ [API RESPONSE]", { status: res.status, ok: false, durationMs });
      return NextResponse.json({ error: "weather_fetch_failed", status: res.status }, { status: res.status });
    }

    const data = await res.json();

    console.log("🌈 [API RESPONSE]", {
      status: res.status,
      ok: res.ok,
      durationMs,
      condition: data?.weather?.[0]?.description,
      temperatureC: data?.main?.temp,
      humidity: data?.main?.humidity,
    });

    const rawTempC = typeof data?.main?.temp === "number" ? data.main.temp : null;
    const tempC = rawTempC;
    const tempF = typeof tempC === "number" ? (tempC * 9) / 5 + 32 : null;
    const humidity = typeof data?.main?.humidity === "number" ? data.main.humidity : null;
    const condition = data?.weather?.[0]?.description || data?.weather?.[0]?.main || "";
    const bucket = resolveBucket(tempC, condition, humidity);
    const weatherHint = resolveHint(condition) || (bucket ? `${bucket}` : null);

    const payload = {
      bucket,
      condition,
      temperatureC: typeof tempC === "number" ? Number(tempC.toFixed(1)) : null,
      temperatureF: typeof tempF === "number" ? Number(tempF.toFixed(1)) : null,
      humidity: typeof humidity === "number" ? Math.round(humidity) : null,
      weatherHint,
      source: "openweather",
      durationMs,
    };

    cache.set(roundedKey, { expiresAt: now + CACHE_TTL, payload });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("weather_api_error", err);
    return NextResponse.json({ error: "weather_fetch_error" }, { status: 500 });
  }
}
