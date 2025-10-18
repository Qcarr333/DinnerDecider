"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { track } from "@/lib/track";
import { useDinner } from "@/context/DinnerContext";
import { FOOD_TYPES } from "@/data/foodTypes";
import { fetchNearbyRestaurants } from "@/lib/fetchNearbyRestaurants";

export default function OutputScreen() {
  const {
    restaurantsCache,
    setRestaurantsCache,
    selectedCombo,
    r2Rerolls,
    setR2Rerolls,
    user,
    location,
    filters,
    saveRestaurant,
  } = useDinner();
  const [index, setIndex] = useState(0);
  const [seenIds, setSeenIds] = useState(() => new Set());

  // If we have a confirmed combo, refetch with combo-influenced keyword/radius
  useEffect(() => {
    (async () => {
      if (!selectedCombo || !location?.lat || !location?.lng) return;
      try {
        console.log("🎯 R2 Query Based On:", selectedCombo);
        const data = await fetchNearbyRestaurants(location.lat, location.lng, filters, selectedCombo);
        setRestaurantsCache(Array.isArray(data) ? data : []);
      } catch (e) {
        // ignore, fallback to existing cache
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCombo, location?.lat, location?.lng]);

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
  const labels = useMemo(() => {
    if (!selectedCombo) return null;
    const idToLabel = new Map([
      ...FOOD_TYPES.region.map((x) => [x.id, x.label]),
      ...FOOD_TYPES.specialized.map((x) => [x.id, x.label]),
    ]);
    return {
      Region: idToLabel.get(selectedCombo.region) || "",
      Specialized: idToLabel.get(selectedCombo.specialized) || "",
    };
  }, [selectedCombo]);

  // Combo summary chips
  const ComboSummary = labels ? (
    <div className="mb-3 text-sm text-gray-700">
      <span className="font-semibold">{labels.Region}</span>
      <span className="mx-1">→</span>
      <span>{selectedCombo?.experience ? new Map(FOOD_TYPES.experience.map((x) => [x.id, x.label])).get(selectedCombo.experience) : ""}</span>
      <span className="mx-1">→</span>
      <span className="font-semibold">{labels.Specialized}</span>
      <span className="mx-1">→</span>
      <span>{selectedCombo?.distance ? new Map(FOOD_TYPES.distance.map((x) => [x.id, x.label])).get(selectedCombo.distance) : ""}</span>
    </div>
  ) : null;

  // Local strict filter: require BOTH Region and Specialized matches
  const finalList = useMemo(() => {
    // Only open, operational results
    const base = (Array.isArray(restaurantsCache) ? restaurantsCache : []).filter(
      (r) => r?.open_now === true && (r.business_status ? r.business_status === "OPERATIONAL" : true)
    );
    const list = base;
    if (!labels) return list;
    const region = labels.Region.toLowerCase();
    const spec = labels.Specialized.toLowerCase();
    const filtered = list.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const cuisine = Array.isArray(r.types) ? r.types.join(" ").toLowerCase() : "";
      const address = (r.vicinity || r.address || "").toLowerCase();
      const regionOk = region && (name.includes(region) || cuisine.includes(region) || address.includes(region));
      const specOk = spec && (name.includes(spec) || cuisine.includes(spec));
      return regionOk && specOk;
    });
    return filtered.length ? filtered : list;
  }, [restaurantsCache, labels]);

  try {
    if (labels) {
      console.log("🎯 R2 Filter Applied:", labels);
      console.log("🍽️ R2 Restaurants Returned:", finalList.map((r) => r.name));
    }
  } catch {}

  // Deduplicate sequence across rerolls until the list is exhausted
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

  const hasData = rotationList.length > 0;
  const current = useMemo(() => {
    if (!hasData) return null;
    // find next not-seen item; if all seen, reset seen set
    const allKeys = rotationList.map((r) => r._key);
    const firstUnseenIdx = rotationList.findIndex((r) => !seenIds.has(r._key));
    const pickIdx = firstUnseenIdx >= 0 ? firstUnseenIdx : (index % rotationList.length);
    return rotationList[pickIdx];
  }, [hasData, rotationList, index, seenIds]);

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
        <motion.div
          key={`r2view-${index}`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-2xl bg-white shadow-xl p-6"
        >
          <img src={current.photo} alt={current.name} className="w-full h-48 object-cover rounded-xl mb-3" />
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${current.open_now ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {current.open_now ? "🟢 Open Now" : "🔴 Closed"}
          </span>
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{current.name}</h2>
            <div className="text-sm text-yellow-600" aria-label="rating">⭐ {current.rating?.toFixed?.(1) ?? current.rating}</div>
          </div>
          <div className="mt-2 text-gray-700">{current.address || current.vicinity}</div>
          <div className="mt-2">
            <a href={current.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Visit website
            </a>
          </div>
          <div className="mt-1 text-gray-700">{current.phone}</div>
        </motion.div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full bg-white/80 hover:bg-white px-4 py-2 shadow text-gray-800 disabled:opacity-50"
            disabled={!user?.premium && r2Rerolls >= 6}
            onClick={() => {
              if (!user?.premium && r2Rerolls >= 6) return;
              try { track("reroll_clicked"); } catch {}
              setR2Rerolls((n) => n + 1);
              // mark current as seen, then advance
              if (current?._key) {
                setSeenIds((prev) => {
                  const next = new Set(prev);
                  next.add(current._key);
                  // if we've seen all, reset for a fresh rotation
                  if (rotationList.length > 0 && next.size >= rotationList.length) {
                    return new Set();
                  }
                  return next;
                });
              }
              setIndex((i) => i + 1);
            }}
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

