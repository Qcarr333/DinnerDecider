// Google Places fetch helper with safe fallback to mock data
import { FOOD_TYPES } from "@/data/foodTypes";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSerializableFilters(filters) {
  try {
    return JSON.parse(
      JSON.stringify(filters, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        return value;
      })
    );
  } catch {
    return undefined;
  }
}

function mockResults() {
  return [
    {
      place_id: "mock-italian-1",
      name: "Bella Vita Italian Bistro",
      rating: 4.6,
      address: "123 Main St, Jacksonville, FL",
      open_now: true,
      photo: "/placeholder.jpg",
      website: "https://bellavita.com",
      phone: "(904) 555-1234",
    },
    {
      place_id: "mock-sushi-1",
      name: "Sushi Zen",
      rating: 4.5,
      address: "42 Ocean Ave, Jacksonville Beach, FL",
      open_now: true,
      photo: "/placeholder.jpg",
      website: "https://sushizen.com",
      phone: "(904) 555-9876",
    },
    {
      place_id: "mock-taco-1",
      name: "Taco Loco",
      rating: 4.3,
      address: "77 Market St, Jacksonville, FL",
      open_now: false,
      photo: "/placeholder.jpg",
      website: "https://tacoloco.example",
      phone: "(904) 555-2222",
    },
  ];
}

export async function fetchNearbyRestaurants(lat, lng, filters = {}, selectedCombo = null) {
  // Dev logging
  try {
    // eslint-disable-next-line no-console
    console.log("[fetchNearbyRestaurants] coords:", { lat, lng }, "filters:", toSerializableFilters(filters), "selectedCombo:", selectedCombo);
  } catch {}

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const hasKey = typeof API_KEY === "string" && API_KEY.trim().length > 0;

  // Build radius from R1 selection if present, else from filters (max selected)
  let radius = 5000;
  try {
    if (selectedCombo?.distance) {
      const mapSel = { near: 3000, close: 8000, city: 25000, explore: 25000, drive: 60000, hidden: 10000, trending: 20000 };
      radius = mapSel[selectedCombo.distance] || radius;
    } else {
      const distSel = Array.from(filters?.distance || []);
      if (distSel.length) {
        const map = { near: 8000, close: 48000, explore: 80000, city: 16000, drive: 96000 };
        radius = Math.max(...distSel.map((d) => map[d] || 5000));
      }
    }
  } catch {}

  // Build keyword from R1 combo if present; else derive from filters
  let keyword = "";
  try {
    const idToLabel = new Map([
      ...FOOD_TYPES.specialized.map((x) => [x.id, x.label]),
      ...FOOD_TYPES.region.map((x) => [x.id, x.label]),
      ...FOOD_TYPES.experience.map((x) => [x.id, x.label]),
    ]);
    if (selectedCombo) {
      const parts = [
        idToLabel.get(selectedCombo.region),
        idToLabel.get(selectedCombo.experience),
        idToLabel.get(selectedCombo.specialized),
      ].filter(Boolean);
      keyword = parts.join(" ");
    } else {
      const allSpec = FOOD_TYPES.specialized.map((x) => x.id);
      const selSpec = Array.from(filters?.specialized || []);
      const allReg = FOOD_TYPES.region.map((x) => x.id);
      const selReg = Array.from(filters?.region || []);
      const parts = [];
      if (selSpec.length && selSpec.length < allSpec.length) parts.push(...selSpec.map((id) => idToLabel.get(id)).filter(Boolean));
      if (selReg.length && selReg.length < allReg.length) parts.push(...selReg.map((id) => idToLabel.get(id)).filter(Boolean));
      keyword = parts.join(" ");
    }
  } catch {}

  // If we have a key, attempt live fetch; otherwise fallback to mock after brief delay
  if (hasKey) {
    try {
      const base = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
      const params = new URLSearchParams({
        location: `${lat},${lng}`,
        radius: String(radius),
        type: "restaurant",
        opennow: "true",
        key: API_KEY,
      });
      if (keyword) params.set("keyword", keyword);
      const url = `${base}?${params.toString()}`;
      try { console.log("🎯 Using R1 combo for query:", selectedCombo); console.log("🌐 Google Places Request:", { url, radius, keyword }); } catch {}

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const raw = Array.isArray(data?.results) ? data.results : [];
      const filtered = raw.filter((r) => {
        const operational = r.business_status === "OPERATIONAL";
        const ratingOk = (r.rating ?? 0) >= 4.0;
        const notBarOrTruck = !(/(?:truck|food\s?truck|club|bar)/i.test(r.name || "")) && !((r.types || []).some((t) => /bar|night_club/i.test(t)));
        const openNow = !!r?.opening_hours?.open_now; // enforce open now
        return operational && ratingOk && notBarOrTruck && openNow;
      });

      // map and dedupe by place_id
      const mapped = filtered.map((place) => ({
        place_id: place.place_id,
        name: place.name,
        rating: place.rating,
        address: place.vicinity,
        vicinity: place.vicinity,
        open_now: place?.opening_hours?.open_now ?? false,
        photo: place?.photos?.[0]
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${API_KEY}`
          : "/placeholder.jpg",
        website: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        phone: "N/A",
        business_status: place.business_status,
        types: place.types,
      }));

      const seen = new Set();
      const results = mapped.filter((p) => {
        const key = p.place_id || `${p.name}|${p.address || p.vicinity || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      try {
        console.log(`✅ Filtered ${results.length}/${raw.length} restaurants`, results.map((r) => `${r.name} (${r.rating})`));
        const excluded = raw.filter(
          (r) => r.business_status !== "OPERATIONAL" || /(?:truck|food\s?truck|club|bar)/i.test(r.name || "") || (r.rating ?? 0) < 4.0
        );
        console.log("🚫 Excluded results:", excluded.map((x) => `${x.name} (${x.business_status}, ${x.rating})`));
      } catch {}

      if (results.length > 0) return results;

      // Fall through to mock if empty results
    } catch (err) {
      try {
        // eslint-disable-next-line no-console
        console.warn("[fetchNearbyRestaurants] Falling back to mock due to error:", err?.message || err);
      } catch {}
    }
  }

  // Fallback path: simulate small delay and return mock
  await sleep(400);
  return mockResults();
}

export default fetchNearbyRestaurants;
