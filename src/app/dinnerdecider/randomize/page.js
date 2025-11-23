"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDinner } from "@/context/DinnerContext";
import { FOOD_TYPES, LAYER_LABELS } from "@/data/foodTypes";
import { suggestSmart } from "@/lib/aiRecommender";
import { fetchNearbyRestaurants } from "@/lib/fetchNearbyRestaurants";
import { track } from "@/lib/track";

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function RandomizePage() {
  const router = useRouter();
  const {
    filters,
    restaurantsCache,
    setSelectedCombo,
    r1Rerolls,
    setR1Rerolls,
    user,
    setRestaurantsCache,
    activeLocation,
    mood,
    weather,
    preferences,
    setR2Seed,
    timeCategory,
    planAhead,
  } = useDinner();
  const [combo, setCombo] = useState(null);
  const drinkMode = mood === "drinks";

  const layerOptions = useMemo(() => {
    const build = (layerKey) => {
      const data = filters?.[layerKey];
      const totalIds = FOOD_TYPES[layerKey].map((x) => x.id);
      const selected = data?.selected instanceof Set ? Array.from(data.selected) : [];
      const isCustom = data?.mode === "custom" && selected.length > 0 && selected.length < totalIds.length;
      return {
        ids: isCustom ? selected : totalIds,
        isWildcard: !isCustom,
      };
    };
    return {
      region: build("region"),
      experience: build("experience"),
      specialized: build("specialized"),
      distance: build("distance"),
    };
  }, [filters]);

  const dontCareLayers = useMemo(() => {
    return Object.values(layerOptions).reduce((count, entry) => (entry.isWildcard ? count + 1 : count), 0);
  }, [layerOptions]);

  const idToLabel = useMemo(() => {
    const m = new Map();
    ["region", "experience", "specialized", "distance"].forEach((k) => {
      for (const it of FOOD_TYPES[k]) m.set(it.id, it.label);
    });
    return m;
  }, []);

  const labelFor = (id) => {
    if (!id) return "Any";
    return idToLabel.get(id) || "Any";
  };

  const reroll = () => {
    if (!user?.premium && r1Rerolls >= 3) return;
    setR1Rerolls((n) => n + 1);
    const chooseValue = (layerKey) => {
      const entry = layerOptions[layerKey];
      if (!entry || entry.isWildcard) return null;
      return pickRandom(entry.ids);
    };
    const makeCombo = () => ({
      region: chooseValue("region"),
      experience: chooseValue("experience"),
      specialized: chooseValue("specialized"),
      distance: chooseValue("distance"),
    });
    let nextCombo = makeCombo();
    if (dontCareLayers >= 2) {
      try {
        const raw = localStorage.getItem("dd_last_any_combo");
        const prev = raw ? JSON.parse(raw) : null;
        let attempts = 0;
        while (prev && isSameCombo(prev, nextCombo) && attempts < 5) {
          nextCombo = makeCombo();
          attempts += 1;
        }
        localStorage.setItem("dd_last_any_combo", JSON.stringify(nextCombo));
        const seed = Date.now();
        setR2Seed(seed);
        try { track("r2_randomized_after_any_layers", { seed, layers: dontCareLayers }); } catch {}
      } catch {}
    } else {
      setR2Seed(null);
    }
    try {
      // record rejected previous combo for learning
      if (combo) {
        const arr = JSON.parse(localStorage.getItem("dd_reroll_history") || "[]");
        arr.push(combo);
        localStorage.setItem("dd_reroll_history", JSON.stringify(arr.slice(-100)));
      }
    } catch {}
    setCombo(nextCombo);
    try { console.log("🌀 R1 Combo Generated:", nextCombo); } catch {}
  };

  useEffect(() => {
    setR1Rerolls(0);
    reroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proceed = () => {
    setSelectedCombo(combo);
    router.replace("/dinnerdecider/output");
  };

  const autoPick = async () => {
    if (!user?.premium) {
      try { track("ai_auto_pick_locked"); } catch {}
      alert("Upgrade to Premium to unlock Auto Pick 🍽️");
      return;
    }
    try { track("ai_auto_pick_triggered"); } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem("dd_saved_restaurants") || "[]");
      const smart = await suggestSmart({
        region: new Set(layerOptions.region.ids),
        experience: new Set(layerOptions.experience.ids),
        specialized: new Set(layerOptions.specialized.ids),
        distance: new Set(layerOptions.distance.ids),
      }, saved, { mood, weather, prefs: preferences, timeCategory, drinkMode });
      const rec = smart.combo;
      setSelectedCombo(rec);
      const lat = activeLocation?.lat ?? 30.3322;
      const lng = activeLocation?.lng ?? -81.6557;
      const data = await fetchNearbyRestaurants(lat, lng, filters, rec, {
        mood,
        weather,
        prefs: preferences,
        timeCategory,
        weatherHint: weather?.weatherHint,
        planAheadEnabled: Boolean(planAhead?.enabled && planAhead?.location),
        drinkMode,
      });
      setRestaurantsCache(Array.isArray(data) ? data : []);
      router.replace("/dinnerdecider/output");
    } catch (e) {
      router.replace("/dinnerdecider/output");
    }
  };

  if (!restaurantsCache || restaurantsCache.length === 0) {
    return (
      <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-teal-100 to-pink-100 px-4">
        <div className="text-gray-700">No data loaded. Start from the dashboard.</div>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-teal-100 to-pink-100 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white/90 backdrop-blur shadow p-6">
        <h1 className="text-2xl font-bold text-teal-700 mb-3">Your Combo</h1>
        {combo ? (
          <motion.div
            key="r1combo"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-gray-800"
          >
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-teal-700 font-semibold">{LAYER_LABELS.region}</div>
                <div className="text-lg">{labelFor(combo.region)}</div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-indigo-700 font-semibold">{LAYER_LABELS.experience}</div>
                <div className="text-lg">{labelFor(combo.experience)}</div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-rose-700 font-semibold">{LAYER_LABELS.specialized}</div>
                <div className="text-lg font-medium">{labelFor(combo.specialized)}</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold">{LAYER_LABELS.distance}</div>
                <div className="text-lg">{labelFor(combo.distance)}</div>
              </div>
            </div>
          </motion.div>
        ) : null}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button onClick={reroll} disabled={!user?.premium && r1Rerolls >= 3} className="rounded-lg bg-white px-4 py-2 border border-gray-300 hover:bg-teal-50 text-gray-800 disabled:opacity-50">🎯 Let’s Try Again</button>
          <button onClick={proceed} className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700">🍽️ Let’s Find a Restaurant</button>
          <button onClick={autoPick} className="rounded-lg bg-white px-4 py-2 border border-gray-300 hover:bg-amber-50 text-gray-800">✨ Auto Pick Tonight’s Spot (💎 Premium)</button>
        </div>
        {!user?.premium && (
          <p className="mt-2 text-xs text-gray-600">Free tier: {Math.min(r1Rerolls,3)} / 3 R1 rerolls used.</p>
        )}
      </div>
    </main>
  );
}

function isSameCombo(a, b) {
  if (!a || !b) return false;
  return a.region === b.region && a.experience === b.experience && a.specialized === b.specialized && a.distance === b.distance;
}
