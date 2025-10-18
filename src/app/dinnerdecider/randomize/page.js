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
  const { filters, restaurantsCache, setSelectedCombo, r1Rerolls, setR1Rerolls, user, setRestaurantsCache, location } = useDinner();
  const [combo, setCombo] = useState(null);

  const pool = useMemo(() => {
    const asArray = (s) => Array.from(s || []);
    return {
      region: asArray(filters.region).length ? asArray(filters.region) : FOOD_TYPES.region.map((x) => x.id),
      experience: asArray(filters.experience).length ? asArray(filters.experience) : FOOD_TYPES.experience.map((x) => x.id),
      specialized: asArray(filters.specialized).length ? asArray(filters.specialized) : FOOD_TYPES.specialized.map((x) => x.id),
      distance: asArray(filters.distance).length ? asArray(filters.distance) : FOOD_TYPES.distance.map((x) => x.id),
    };
  }, [filters]);

  const idToLabel = useMemo(() => {
    const m = new Map();
    ["region", "experience", "specialized", "distance"].forEach((k) => {
      for (const it of FOOD_TYPES[k]) m.set(it.id, it.label);
    });
    return m;
  }, []);

  const reroll = () => {
    if (!user?.premium && r1Rerolls >= 3) return;
    setR1Rerolls((n) => n + 1);
    const c = {
      region: pickRandom(pool.region),
      experience: pickRandom(pool.experience),
      specialized: pickRandom(pool.specialized),
      distance: pickRandom(pool.distance),
    };
    try {
      // record rejected previous combo for learning
      if (combo) {
        const arr = JSON.parse(localStorage.getItem("dd_reroll_history") || "[]");
        arr.push(combo);
        localStorage.setItem("dd_reroll_history", JSON.stringify(arr.slice(-100)));
      }
    } catch {}
    setCombo(c);
    try { console.log("🌀 R1 Combo Generated:", c); } catch {}
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
        region: new Set(pool.region),
        experience: new Set(pool.experience),
        specialized: new Set(pool.specialized),
        distance: new Set(pool.distance),
      }, saved);
      const rec = smart.combo;
      setSelectedCombo(rec);
      const lat = location?.lat ?? 30.3322;
      const lng = location?.lng ?? -81.6557;
      const data = await fetchNearbyRestaurants(lat, lng, filters, rec);
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
                <div className="text-lg">{idToLabel.get(combo.region)}</div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-indigo-700 font-semibold">{LAYER_LABELS.experience}</div>
                <div className="text-lg">{idToLabel.get(combo.experience)}</div>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-rose-700 font-semibold">{LAYER_LABELS.specialized}</div>
                <div className="text-lg font-medium">{idToLabel.get(combo.specialized)}</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold">{LAYER_LABELS.distance}</div>
                <div className="text-lg">{idToLabel.get(combo.distance)}</div>
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
