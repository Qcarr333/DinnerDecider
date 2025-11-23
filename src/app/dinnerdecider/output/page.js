"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { track } from "@/lib/track";
import { useDinner } from "@/context/DinnerContext";
import { FOOD_TYPES } from "@/data/foodTypes";
import { fetchNearbyRestaurants } from "@/lib/fetchNearbyRestaurants";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function OutputScreen() {
  const {
    restaurantsCache,
    setRestaurantsCache,
  setSelectedCombo,
    selectedCombo,
    r2Rerolls,
    setR2Rerolls,
  setR1Rerolls,
    user,
    activeLocation,
    filters,
    saveRestaurant,
    mood,
    weather,
    preferences,
    timeCategory,
    planAhead,
  } = useDinner();
  const [rotationCursor, setRotationCursor] = useState(0);
  const sessionSeenRef = useRef(new Set());
  const lastLoggedKeyRef = useRef(null);
  const refreshRef = useRef(0);
  const metaSnapshotRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const planAheadActive = useMemo(() => Boolean(planAhead?.enabled && planAhead?.location), [planAhead]);
  const drinkMode = mood === "drinks";
  const planAheadDescriptor = useMemo(() => {
    if (!planAheadActive) return null;
    const locationLabel = planAhead?.label || "Selected location";
    const hour24 = Number.isFinite(planAhead?.hour24) ? ((Math.floor(planAhead.hour24) % 24) + 24) % 24 : null;
    const meridiem = planAhead?.meridiem === "AM" || planAhead?.meridiem === "PM"
      ? planAhead.meridiem
      : hour24 !== null && hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 === null ? null : (hour24 % 12 === 0 ? 12 : hour24 % 12);
    const timeText = hour12 ? `${hour12} ${meridiem}` : null;
    const offsetMs = Number.isFinite(planAhead?.utcOffsetMinutes) ? planAhead.utcOffsetMinutes * 60000 : 0;
    let dayName = null;
    if (planAhead?.date) {
      const base = new Date(`${planAhead.date}T12:00:00Z`);
      if (!Number.isNaN(base.getTime())) {
        const adjusted = new Date(base.getTime() + offsetMs);
        dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(adjusted);
      }
    }
    const parts = [`Planning for ${locationLabel}`];
    if (planAhead?.timeCategory) parts.push(planAhead.timeCategory);
    if (timeText) parts.push(`at ${timeText}`);
    if (planAhead?.date) parts.push(`on ${planAhead.date}${dayName ? ` (${dayName})` : ""}`);
    if (planAhead?.timeZoneId) parts.push(planAhead.timeZoneId);
    return `🗺️ ${parts.join(" • ")}`;
  }, [planAheadActive, planAhead]);

  const labelMap = useMemo(() => {
    const map = new Map();
    ["region", "experience", "specialized", "distance"].forEach((layer) => {
      for (const item of FOOD_TYPES[layer]) map.set(item.id, item.label);
    });
    return map;
  }, []);

  const layerModes = useMemo(() => {
    return ["region", "experience", "specialized", "distance"].reduce((acc, layerKey) => {
      const data = filters?.[layerKey];
      const total = FOOD_TYPES[layerKey].length;
      const selectedSet = data?.selected instanceof Set ? data.selected : new Set();
      const selectedCount = selectedSet.size;
      const isCustom = data?.mode === "custom" && selectedCount > 0 && selectedCount < total;
      acc[layerKey] = {
        wildcard: !isCustom,
        selectedIds: isCustom ? Array.from(selectedSet) : [],
      };
      return acc;
    }, {});
  }, [filters]);

  const comboFilters = useMemo(() => {
    const build = (layerKey) => {
      const wildcard = layerModes[layerKey]?.wildcard ?? true;
      const comboId = selectedCombo?.[layerKey] ?? null;
      const ids = comboId ? [comboId] : (wildcard ? [] : layerModes[layerKey]?.selectedIds || []);
      const labels = ids.map((id) => labelMap.get(id) || id);
      return { ids, labels, wildcard };
    };
    return {
      region: build("region"),
      experience: build("experience"),
      specialized: build("specialized"),
      distance: build("distance"),
    };
  }, [labelMap, layerModes, selectedCombo]);

  const restaurantMatchesLabel = useCallback((restaurant, label) => {
    if (!label) return false;
    const target = label.toLowerCase();
    const haystack = [
      restaurant?.name,
      restaurant?.vicinity,
      restaurant?.address,
      ...(Array.isArray(restaurant?.types) ? restaurant.types : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(target);
  }, []);

  // If we have a confirmed combo, refetch with combo-influenced keyword/radius
  useEffect(() => {
    (async () => {
      if (!selectedCombo || !activeLocation?.lat || !activeLocation?.lng) return;
      try {
        console.log("🎯 R2 Query Based On:", selectedCombo);
        const data = await fetchNearbyRestaurants(activeLocation.lat, activeLocation.lng, filters, selectedCombo, {
          mood,
          weather,
          prefs: preferences,
          timeCategory,
          weatherHint: weather?.weatherHint,
          planAheadEnabled: Boolean(planAhead?.enabled && planAhead?.location),
          drinkMode,
        });
        setRestaurantsCache(Array.isArray(data) ? data : []);
      } catch (e) {
        // ignore, fallback to existing cache
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCombo, activeLocation?.lat, activeLocation?.lng, mood, weather, preferences, timeCategory, planAhead, drinkMode]);

  // Accept auto-pick cache handoff if present
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dd_auto_pick_cache");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) setRestaurantsCache(list);
        localStorage.removeItem("dd_auto_pick_cache");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Labels for UI and filter
  const summaryLabels = useMemo(() => {
    const fallback = "Any";
    const labelFor = (layerKey) => {
      const id = selectedCombo?.[layerKey];
      if (!id) return fallback;
      return labelMap.get(id) || fallback;
    };
    if (!selectedCombo) {
      return {
        region: comboFilters.region.wildcard ? fallback : comboFilters.region.labels[0] || fallback,
        experience: comboFilters.experience.wildcard ? fallback : comboFilters.experience.labels[0] || fallback,
        specialized: comboFilters.specialized.wildcard ? fallback : comboFilters.specialized.labels[0] || fallback,
        distance: comboFilters.distance.wildcard ? fallback : comboFilters.distance.labels[0] || fallback,
      };
    }
    return {
      region: labelFor("region"),
      experience: labelFor("experience"),
      specialized: labelFor("specialized"),
      distance: labelFor("distance"),
    };
  }, [comboFilters, labelMap, selectedCombo]);

  // Combo summary chips
  const ComboSummary = summaryLabels ? (
    <div className="mb-3 text-sm text-gray-700">
      <span className="font-semibold">{summaryLabels.region}</span>
      <span className="mx-1">→</span>
      <span>{summaryLabels.experience}</span>
      <span className="mx-1">→</span>
      <span className="font-semibold">{summaryLabels.specialized}</span>
      <span className="mx-1">→</span>
      <span>{summaryLabels.distance}</span>
    </div>
  ) : null;

  const contextHeadline = useMemo(() => {
    if (planAheadDescriptor) return planAheadDescriptor;
    if (!timeCategory) return null;
    const emojiMap = {
      "Early Riser": "🐓",
      Breakfast: "🍳",
      Lunch: "🥪",
      Snack: "🍰",
      Dinner: "🍷",
      Brunch: "🥂",
      "Late Night": "🌙",
    };
    const now = new Date();
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
    const hour = now.getHours();
    let descriptor = dayName;
    if (timeCategory === "Late Night") descriptor = `${dayName} night`;
    else if (timeCategory === "Dinner" && hour >= 17) descriptor = `${dayName} night`;
    else if (timeCategory === "Early Riser" || timeCategory === "Breakfast") descriptor = `${dayName} morning`;
    else if (timeCategory === "Snack") descriptor = `${dayName} afternoon`;
    else if (timeCategory === "Lunch") descriptor = `${dayName} lunch`;
    const weatherText = (weather?.weatherHint || weather?.condition || weather?.bucket || "").toString().trim();
    const parts = [];
    if (weatherText) parts.push(weatherText.toLowerCase());
    parts.push(descriptor.toLowerCase());
    const tail = parts.filter(Boolean).join(" ");
    const emoji = emojiMap[timeCategory] || "🕒";
    return `${emoji} ${timeCategory} picks${tail ? ` for a ${tail}` : ""}`;
  }, [planAheadDescriptor, timeCategory, weather]);

  const finalList = useMemo(() => {
    const base = (Array.isArray(restaurantsCache) ? restaurantsCache : []).filter((r) => {
      if (r?.isFallback) return true;
      return r?.open_now === true && (r.business_status ? r.business_status === "OPERATIONAL" : true);
    });

    const filtered = base.filter((restaurant) => {
      if (restaurant?.isFallback) return true;
      const regionOk = comboFilters.region.wildcard || comboFilters.region.labels.some((label) => restaurantMatchesLabel(restaurant, label));
      const specializedOk = comboFilters.specialized.wildcard || comboFilters.specialized.labels.some((label) => restaurantMatchesLabel(restaurant, label));
      const experienceOk = comboFilters.experience.wildcard || comboFilters.experience.labels.some((label) => restaurantMatchesLabel(restaurant, label));
      return regionOk && specializedOk && experienceOk;
    });

    return filtered.length ? filtered : base;
  }, [comboFilters, restaurantMatchesLabel, restaurantsCache]);

  useEffect(() => {
    try {
      console.log("🎯 R2 Filter Applied:", { summaryLabels, comboFilters });
      console.log("🍽️ R2 Restaurants Returned:", finalList.map((r) => r.name));
    } catch {}
  }, [comboFilters, finalList, summaryLabels]);

  const rotationList = useMemo(() => {
    const seen = new Set();
    const unique = [];
    for (const r of finalList) {
      const key = r.place_id || `${r.name}|${r.address || r.vicinity || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ ...r, _key: key });
    }
    return unique;
  }, [finalList]);

  const rotationFingerprint = useMemo(() => rotationList.map((item) => item._key).join("|"), [rotationList]);

  useEffect(() => {
    sessionSeenRef.current = new Set();
    lastLoggedKeyRef.current = null;
    setRotationCursor(0);
  }, [rotationFingerprint]);

  useEffect(() => {
    if (rotationList.length === 0) return;
    if (rotationCursor >= rotationList.length) {
      setRotationCursor(0);
    }
  }, [rotationCursor, rotationList.length]);

  useEffect(() => {
    const meta = Array.isArray(restaurantsCache) ? restaurantsCache.meta : null;
    if (!meta) return;
    const fingerprint = JSON.stringify({
      keyword: meta.keyword || "",
      dedupedCount: meta.dedupedCount || 0,
      originalCount: meta.originalCount || 0,
      radius: meta.radius || 0,
      radiusSource: meta.radiusSource || "",
    });
    if (metaSnapshotRef.current === fingerprint) return;
    metaSnapshotRef.current = fingerprint;
    try {
      console.log("🧪 R2 Meta Snapshot:", meta);
    } catch {}
  }, [restaurantsCache]);

  const hasData = rotationList.length > 0;
  const current = hasData ? rotationList[Math.min(rotationCursor, rotationList.length - 1)] : null;

  useEffect(() => {
    if (!current?._key) return;
    if (lastLoggedKeyRef.current === current._key) return;
    sessionSeenRef.current.add(current._key);
    lastLoggedKeyRef.current = current._key;
    const shown = sessionSeenRef.current.size;
    const remaining = Math.max(rotationList.length - shown, 0);
    try {
      console.log("R2 Dedup:", { shown, remaining });
    } catch {}
  }, [current, rotationList.length]);

  const refetchRotation = useCallback(async (reason) => {
    if (!selectedCombo) return false;
  const lat = activeLocation?.lat ?? 30.3322;
  const lng = activeLocation?.lng ?? -81.6557;
    if (!lat || !lng) return false;
    const now = Date.now();
    if (now - refreshRef.current < 5000) return false;
    refreshRef.current = now;
    setIsRefreshing(true);
    try {
      console.log("♻️ R2 rotation refresh triggered", { reason, selectedCombo, lat, lng });
      const data = await fetchNearbyRestaurants(lat, lng, filters, selectedCombo, {
        mood,
        weather,
        prefs: preferences,
        timeCategory,
        weatherHint: weather?.weatherHint,
        planAheadEnabled: Boolean(planAhead?.enabled && planAhead?.location),
        drinkMode,
      });
      if (Array.isArray(data)) {
        setRestaurantsCache(data);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("R2 refetch failed", err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [filters, activeLocation, mood, preferences, selectedCombo, setRestaurantsCache, timeCategory, weather, planAhead, drinkMode]);

  const handleReroll = useCallback(async () => {
    if (!user?.premium && r2Rerolls >= 6) return;
    if (!rotationList.length) return;
    try { track("reroll_clicked"); } catch {}
    setR2Rerolls((n) => n + 1);

    const seen = sessionSeenRef.current;
    const length = rotationList.length;

    const findNextIndex = () => {
      for (let offset = 1; offset <= length; offset += 1) {
        const idx = (rotationCursor + offset) % length;
        if (!seen.has(rotationList[idx]._key)) return idx;
      }
      return -1;
    };

    const nextIndex = findNextIndex();
    if (nextIndex === -1) {
      const refreshed = await refetchRotation("rotation_exhausted");
      if (!refreshed) {
        seen.clear();
        lastLoggedKeyRef.current = null;
        setRotationCursor((prev) => (prev + 1) % length);
      }
    } else {
      setRotationCursor(nextIndex);
    }
  }, [r2Rerolls, refetchRotation, rotationCursor, rotationList, setR2Rerolls, user?.premium]);

  const handleRerollFilters = useCallback(() => {
    console.log("🔁 User triggered a re-roll after Oracle fallback");
    try { track("oracle_reroll_clicked"); } catch {}
    try { setSelectedCombo(null); } catch {}
    try { setR1Rerolls(0); } catch {}
    router.push("/dinnerdecider/randomize?oracle=1");
  }, [router, setR1Rerolls, setSelectedCombo]);

  if (!hasData) {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-pink-100 to-teal-100">
        <div className="text-gray-700">No restaurants loaded.</div>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-pink-100 to-teal-100 px-4">
      <div className="w-full max-w-xl">
        {ComboSummary}
        {contextHeadline ? <p className="mb-2 text-sm italic text-gray-600">{contextHeadline}</p> : null}
        <motion.div
          key={`r2view-${current?._key || rotationCursor}`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-2xl bg-white shadow-xl p-6"
        >
          {current?.isFallback ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-400">
              <h3 className="text-lg font-semibold mb-2">{current.name}</h3>
              <p className="italic mb-4">{current.vicinity || current.address}</p>

              {current.triggerReroll && (
                <button
                  onClick={() => handleRerollFilters?.()}
                  className="mt-2 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 px-5 py-2 text-white font-bold hover:scale-105 transition-transform duration-200 animate-shake"
                >
                  🔄 Re-roll
                </button>
              )}
            </div>
          ) : (
            <>
              <Image
                src={current.photo || "/placeholder.jpg"}
                alt={current.name}
                width={720}
                height={288}
                className="w-full h-48 object-cover rounded-xl mb-3"
                unoptimized
                priority
              />
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${current.open_now ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {current.open_now ? "🟢 Open Now" : "🔴 Closed"}
              </span>
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{current.name}</h2>
                <div className="text-sm text-yellow-600" aria-label="rating">⭐ {current.rating?.toFixed?.(1) ?? current.rating}</div>
              </div>
              <div className="mt-2 text-gray-700">{current.address || current.vicinity}</div>
              {current.website ? (
                <div className="mt-2">
                  <a href={current.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Visit website
                  </a>
                </div>
              ) : null}
              {current.phone ? <div className="mt-1 text-gray-700">{current.phone}</div> : null}
            </>
          )}
        </motion.div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full bg-white/80 hover:bg-white px-4 py-2 shadow text-gray-800 disabled:opacity-50"
            disabled={(!user?.premium && r2Rerolls >= 6) || isRefreshing}
            onClick={handleReroll}
          >
            Not Quite Happy?
          </button>
          <button
            type="button"
            className="rounded-full bg-white/80 hover:bg-white px-4 py-2 shadow text-gray-800"
            onClick={() => alert("Premium feature soon!")}
          >
            🍽️ Save
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full bg-emerald-600 text-white px-4 py-2 shadow"
            onClick={() => {
              try { saveRestaurant(current); } catch {}
              try {
                const w = JSON.parse(localStorage.getItem("dd_feedback_weights") || "{\"region\":{},\"specialized\":{}}" );
                const inc = (obj, k, d=1)=>{ obj[k]= (obj[k]||0)+d; };
                if (selectedCombo?.region) inc(w.region, selectedCombo.region, 1);
                if (selectedCombo?.specialized) inc(w.specialized, selectedCombo.specialized, 1);
                localStorage.setItem("dd_feedback_weights", JSON.stringify(w));
                console.log("🧭 Feedback received → updated weight map", w);
                track("ai_suggested_combo_accepted");
              } catch {}
            }}
          >
            👍 Liked This
          </button>
          <button
            type="button"
            className="rounded-full bg-rose-600 text-white px-4 py-2 shadow"
            onClick={() => {
              try {
                const w = JSON.parse(localStorage.getItem("dd_feedback_weights") || "{\"region\":{},\"specialized\":{}}" );
                const dec = (obj, k, d=1)=>{ obj[k]= (obj[k]||0)-d; };
                if (selectedCombo?.region) dec(w.region, selectedCombo.region, 1);
                if (selectedCombo?.specialized) dec(w.specialized, selectedCombo.specialized, 1);
                localStorage.setItem("dd_feedback_weights", JSON.stringify(w));
                console.log("🧭 Feedback received → updated weight map", w);
                track("ai_suggested_combo_rejected");
              } catch {}
            }}
          >
            👎 Not My Taste
          </button>
        </div>

        {!user?.premium && (
          <p className="mt-2 text-center text-xs text-gray-700">Free tier: {Math.min(r2Rerolls, 6)} / 6 R2 rerolls used.</p>
        )}
      </div>
    </main>
  );
}

