import { FOOD_TYPES } from "@/data/foodTypes";
import { track } from "@/lib/track";

const LABEL_MAP = {
  region: new Map(FOOD_TYPES.region.map((item) => [item.id, item.label || item.name || item.id])),
  experience: new Map(FOOD_TYPES.experience.map((item) => [item.id, item.label || item.name || item.id])),
  specialized: new Map(FOOD_TYPES.specialized.map((item) => [item.id, item.label || item.name || item.id])),
  distance: new Map(FOOD_TYPES.distance.map((item) => [item.id, item.label || item.name || item.id])),
};

const RADIUS_LOOKUP = {
  near: 3000,
  close: 8000,
  city: 25000,
  explore: 25000,
  drive: 60000,
  hidden: 10000,
  trending: 20000,
  budget: 8000,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSerializableFilters(filters) {
  try {
    return JSON.parse(
      JSON.stringify(filters, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        if (value && typeof value === "object" && value.selected instanceof Set) {
          return { ...value, selected: Array.from(value.selected) };
        }
        return value;
      })
    );
  } catch {
    return undefined;
  }
}

function readLayer(filters, layerKey) {
  const raw = filters?.[layerKey];
  if (!raw || typeof raw !== "object") {
    return { mode: "any", selected: [] };
  }
  if (raw.selected instanceof Set) {
    return { mode: raw.mode === "custom" ? "custom" : "any", selected: Array.from(raw.selected) };
  }
  if (Array.isArray(raw)) {
    return { mode: raw.length ? "custom" : "any", selected: raw };
  }
  return {
    mode: raw.mode === "custom" ? "custom" : "any",
    selected: Array.isArray(raw.selected) ? raw.selected : [],
  };
}

function dedupeKeywordParts(parts) {
  return Array.from(new Set(parts.filter(Boolean).map((part) => part.trim()).filter(Boolean)));
}

function buildActiveFilters(filters, selectedCombo) {
  const baseState = ["region", "experience", "specialized", "distance"].reduce((acc, layerKey) => {
    const row = readLayer(filters, layerKey);
    const selectedIds = Array.isArray(row.selected) ? row.selected : [];
    const isCustom = row.mode === "custom" && selectedIds.length > 0;
    acc[layerKey] = {
      mode: isCustom ? "custom" : "any",
      selectedIds: isCustom ? selectedIds : [],
    };
    return acc;
  }, {});

  const activeFilters = ["region", "experience", "specialized", "distance"].reduce((acc, layerKey) => {
    const comboValue = selectedCombo?.[layerKey];
    if (comboValue) {
      acc[layerKey] = {
        mode: "custom",
        ids: [comboValue],
        values: [LABEL_MAP[layerKey]?.get(comboValue) || String(comboValue)],
      };
      return acc;
    }

    const layer = baseState[layerKey];
    if (layer.mode === "custom" && layer.selectedIds.length > 0) {
      const ids = layer.selectedIds;
      acc[layerKey] = {
        mode: "custom",
        ids,
        values: ids.map((id) => LABEL_MAP[layerKey]?.get(id) || String(id)),
      };
    } else {
      acc[layerKey] = { mode: "any", ids: [], values: ["*"] };
    }
    return acc;
  }, {});

  const filterLogObject = Object.fromEntries(
    Object.entries(activeFilters).map(([layer, info]) => [layer, { mode: info.mode, values: info.values }])
  );

  return { activeFilters, filterLogObject };
}

function resolveRadius(activeFilters, selectedCombo) {
  let radius = 5000;
  let radiusSource = "default";

  const comboDistance = selectedCombo?.distance;
  if (comboDistance) {
    radius = RADIUS_LOOKUP[comboDistance] || radius;
    radiusSource = "combo";
    return { radius, radiusSource };
  }

  if (activeFilters.distance?.mode === "custom" && activeFilters.distance.ids.length) {
    const radii = activeFilters.distance.ids.map((id) => RADIUS_LOOKUP[id] || radius);
    radius = Math.max(...radii);
    radiusSource = "filters";
  }

  return { radius, radiusSource };
}

function assembleKeyword(activeFilters, selectedCombo, signals) {
  const { mood = "any", weather = null, prefs = {}, weatherHint = null, timeCategory = null } = signals || {};

  const keywordTokens = [];
  const fallbackExperienceAnchors = ["steakhouse", "seafood", "cocktail bar", "chef table"];
  const dislikes = new Set((Array.isArray(prefs?.dislikes) ? prefs.dislikes : []).map((item) => String(item).toLowerCase()));

  const addToken = (token) => {
    if (!token) return;
    const value = String(token).trim();
    if (!value) return;
    if (dislikes.has(value.toLowerCase())) return;
    keywordTokens.push(value);
  };

  const experienceIds = [];
  if (selectedCombo?.experience) {
    experienceIds.push(selectedCombo.experience);
  } else if (activeFilters.experience?.mode === "custom" && Array.isArray(activeFilters.experience.ids)) {
    experienceIds.push(...activeFilters.experience.ids);
  }

  const experienceLabels = experienceIds
    .map((id) => LABEL_MAP.experience?.get(id) || String(id))
    .filter(Boolean);

  if (experienceLabels.length) {
    experienceLabels.forEach(addToken);
  } else {
    fallbackExperienceAnchors.forEach(addToken);
  }

  ["region", "specialized", "distance"].forEach((layerKey) => {
    if (selectedCombo?.[layerKey]) {
      addToken(LABEL_MAP[layerKey]?.get(selectedCombo[layerKey]) || selectedCombo[layerKey]);
      return;
    }
    if (activeFilters[layerKey]?.mode === "custom" && Array.isArray(activeFilters[layerKey].ids)) {
      activeFilters[layerKey].ids.forEach((id) => addToken(LABEL_MAP[layerKey]?.get(id) || id));
    }
  });

  const likesParts = Array.isArray(prefs?.likes) ? prefs.likes : [];
  likesParts.forEach(addToken);

  if (mood && mood !== "any") {
    const moodLower = String(mood).toLowerCase();
    const hasMoodInExperience = experienceLabels.some((label) => label.toLowerCase().includes(moodLower));
    if (!hasMoodInExperience) addToken(mood);
  }

  const dedupedTokens = dedupeKeywordParts(keywordTokens);
  const keyword = dedupedTokens.join(" ");
  const queryComplexityScore = keyword.trim() ? keyword.trim().split(/\s+/).length : 0;

  const hints = {};
  const weatherContext = weatherHint || weather?.weatherHint || null;
  if (weatherContext) hints.weatherHint = weatherContext;
  if (weather?.condition) hints.weatherCondition = weather.condition;
  if (weather?.bucket) hints.weatherBucket = weather.bucket;
  if (timeCategory) hints.timeCategory = timeCategory;

  return { keyword, mood, weather, prefs, weatherHint, timeCategory, hints, queryComplexityScore };
}

function buildPlacesUrl({ lat, lng, radius, keyword, apiKey }) {
  const base = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    type: "restaurant",
    opennow: "true",
    key: apiKey,
  });
  if (keyword) params.set("keyword", keyword);
  return `${base}?${params.toString()}`;
}

function transformPlacesResults(raw, apiKey) {
  const filtered = raw.filter((place) => {
    const operational = place.business_status === "OPERATIONAL";
    const ratingOk = (place.rating ?? 0) >= 4.0;
    const openNow = !!place?.opening_hours?.open_now;
    const notBarOrTruck = !(/(?:truck|food\s?truck|club|bar)/i.test(place.name || "")) && !((place.types || []).some((t) => /bar|night_club/i.test(t)));
    return operational && ratingOk && openNow && notBarOrTruck;
  });

  const unique = new Map();
  for (const place of filtered) {
    const key = place.place_id || `${place.name}|${place.vicinity || place.formatted_address || ""}`;
    if (!unique.has(key)) unique.set(key, place);
  }

  const results = Array.from(unique.values()).map((place) => {
    const photoReference = place.photos?.[0]?.photo_reference;
    const photo = photoReference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`
      : "/placeholder.jpg";
    return {
      place_id: place.place_id,
      name: place.name,
      rating: place.rating,
      address: place.vicinity || place.formatted_address,
      open_now: place.opening_hours?.open_now,
      photo,
      website: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      phone: "N/A",
      business_status: place.business_status,
      types: place.types,
    };
  });

  const excluded = raw.filter(
    (place) =>
      place.business_status !== "OPERATIONAL" ||
      (place.rating ?? 0) < 4.0 ||
      !place?.opening_hours?.open_now ||
      /(?:truck|food\s?truck|club|bar)/i.test(place.name || "") ||
      (place.types || []).some((t) => /bar|night_club/i.test(t))
  );

  return { results, excluded };
}

function attachMeta(results, meta) {
  if (!Array.isArray(results) || !meta) return;
  Object.defineProperty(results, "meta", {
    value: meta,
    enumerable: false,
    configurable: true,
  });
}

function buildOracleFallback({ keyword, radius, radiusSource, activeFilters, rawCount = 0, reason = "unknown", hints = null, queryComplexityScore = 0 }) {
  const fallbackResults = [
    {
      name: "The Food Oracles are stumped 😱!",
      rating: "—",
      vicinity: "Try shaking up your filters with a re-roll!",
      address: "Try shaking up your filters with a re-roll!",
      isFallback: true,
      triggerReroll: true,
      photo_reference: null,
      photo: "/placeholder.jpg",
      place_id: "no-results-oracle",
      geometry: {
        location: { lat: 0, lng: 0 },
      },
      opening_hours: { open_now: false },
      open_now: false,
      business_status: "ORACLE_FALLBACK",
      types: ["fallback"],
      website: null,
      phone: null,
    },
  ];

  const placeIds = fallbackResults.map((p) => p.place_id || `${p.name}|fallback`);

  const meta = {
    keyword,
    radius,
    radiusSource,
    activeFilters,
    placeIds,
    dedupedCount: fallbackResults.length,
    originalCount: rawCount,
    fallback: true,
    fallbackReason: reason,
    queryComplexityScore,
  };

  if (hints && Object.keys(hints).length) {
    meta.hints = hints;
  }

  return { results: fallbackResults, meta };
}

export async function internalFetchNearbyRestaurants(lat, lng, filters = {}, selectedCombo = null, signals = {}) {
  const { activeFilters, filterLogObject } = buildActiveFilters(filters, selectedCombo);
  const { radius, radiusSource } = resolveRadius(activeFilters, selectedCombo);
  const { keyword, mood, weather, prefs, weatherHint, timeCategory, hints, queryComplexityScore } = assembleKeyword(activeFilters, selectedCombo, signals);

  try {
    console.log("[fetchNearbyRestaurants] coords:", { lat, lng }, "filters:", toSerializableFilters(filters), "selectedCombo:", selectedCombo, "signals:", signals);
    console.log("🧭 Active Filters →", filterLogObject);
    console.log("🔑 Applied Keywords →", keyword || "(none)");
    console.log("📏 Radius →", { radius, radiusSource });
    console.log("🧮 Query Complexity →", queryComplexityScore);
  } catch {}

  if (queryComplexityScore > 10) {
    console.warn("⚠️ Query too complex; consider trimming signals.", { keyword, score: queryComplexityScore });
  }

  if (mood && mood !== "any") {
    try { track("mood_selector_applied", { mood, keyword }); } catch {}
  }

  const weatherBucket = weather?.bucket;
  if (weatherBucket) {
    try {
      track("weather_context_applied", {
        bucket: weatherBucket,
        hint: weatherHint || weather?.weatherHint,
        keyword,
      });
    } catch {}
  }

  if (timeCategory) {
    try { track("time_context_applied", { category: timeCategory, keyword }); } catch {}
  }

  const API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "").trim();
  const hasKey = API_KEY.length > 0;

  if (hasKey) {
    try {
      const url = buildPlacesUrl({ lat, lng, radius, keyword, apiKey: API_KEY });

      try {
        console.log("🎯 Using R1 combo for query:", selectedCombo);
      } catch {}

      console.log("🌐 [API CALL]", {
        endpoint: url,
        filters: filterLogObject,
        keyword,
        location: { lat, lng },
        radius,
        mood,
        weather: weather?.bucket,
        weatherHint: weatherHint || weather?.weatherHint,
        timeCategory,
      });

      const res = await fetch(url);
      const data = await res.json();

      console.log("📦 [API RESPONSE]", {
        status: res.status,
        ok: res.ok,
        total: Array.isArray(data?.results) ? data.results.length : 0,
        sample: Array.isArray(data?.results) ? data.results.slice(0, 5).map((r) => r.name) : [],
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const raw = Array.isArray(data?.results) ? data.results : [];
      const { results, excluded } = transformPlacesResults(raw, API_KEY);
      const placeIds = results.map((p) => p.place_id || `${p.name}|${p.address || ""}`);

      try {
        console.log(`✅ Filtered ${results.length}/${raw.length} restaurants`, results.map((r) => `${r.name} (${r.rating})`));
        console.log("🚫 Excluded results:", excluded.map((x) => `${x.name} (${x.business_status}, ${x.rating})`));
        console.log("🏷️ R2 returnedPlaceIDs →", placeIds);
        console.log("📊 R2 Dedup Summary →", { dedupedCount: results.length, originalCount: raw.length });
      } catch {}

      if (Array.isArray(prefs?.likes) && prefs.likes.length) {
        const hit = results.find((item) => {
          const haystack = `${item.name} ${(item.types || []).join(" ")} ${(item.address || "")}`.toLowerCase();
          return prefs.likes.some((like) => haystack.includes(String(like).toLowerCase()));
        });
        if (hit) {
          try { track("prefs_match", { restaurant: hit.name, likes: prefs.likes }); } catch {}
        }
      }

      const meta = {
        keyword,
        radius,
        radiusSource,
        activeFilters: filterLogObject,
        placeIds,
        dedupedCount: results.length,
        originalCount: raw.length,
        queryComplexityScore,
      };

      if (hints && Object.keys(hints).length) {
        meta.hints = hints;
      }

      if (results.length > 0) {
        return { results, meta };
      }

      // 🧙‍♂️ Fallback behavior when Google Places returns no results
      console.warn("[fetchNearbyRestaurants] No live matches found — showing Oracle fallback.");
      await sleep(200);
      return buildOracleFallback({
        keyword,
        radius,
        radiusSource,
        activeFilters: filterLogObject,
        rawCount: raw.length,
        reason: "no_results",
        hints,
        queryComplexityScore,
      });
    } catch (err) {
      try {
        console.warn("[fetchNearbyRestaurants] Places API error — showing Oracle fallback.", err?.message || err);
      } catch {}
      await sleep(200);
      return buildOracleFallback({
        keyword,
        radius,
        radiusSource,
        activeFilters: filterLogObject,
        rawCount: 0,
        reason: "api_error",
        hints,
        queryComplexityScore,
      });
    }
  }

  console.warn("[fetchNearbyRestaurants] Missing Google Places API key — showing Oracle fallback.");
  await sleep(200);
  return buildOracleFallback({
    keyword,
    radius,
    radiusSource,
    activeFilters: filterLogObject,
    rawCount: 0,
    reason: "missing_api_key",
    hints,
    queryComplexityScore,
  });
}

export async function fetchNearbyRestaurants(lat, lng, filters = {}, selectedCombo = null, signals = {}) {
  if (typeof window === "undefined") {
    const { results, meta } = await internalFetchNearbyRestaurants(lat, lng, filters, selectedCombo, signals);
    attachMeta(results, meta);
    return results;
  }

  const payload = {
    lat,
    lng,
    filters: toSerializableFilters(filters),
    selectedCombo,
    signals,
  };

  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`places_proxy_failed_${res.status}`);
  }

  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  attachMeta(results, data?.meta);
  return results;
}

export default fetchNearbyRestaurants;
