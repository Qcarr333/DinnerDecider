"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDinner } from "@/context/DinnerContext";
import { fetchNearbyRestaurants } from "@/lib/fetchNearbyRestaurants";

const SANDWICH_STATES = ["🥪", "🥪", "🥪", "🥪", "🍞", "🍞", ""];

export default function FetchScreen() {
  const router = useRouter();
  const { filters, setRestaurantsCache, location, mood, weather, preferences, timeCategory } = useDinner();
  const [done, setDone] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lat = location?.lat ?? 30.3322;
      const lng = location?.lng ?? -81.6557;
      try {
      const results = await fetchNearbyRestaurants(lat, lng, filters, null, {
        mood,
        weather,
        prefs: preferences,
        timeCategory,
        weatherHint: weather?.weatherHint,
      });
        if (cancelled) return;
        setRestaurantsCache(results || []);
        setDone(true);
        setTimeout(() => {
          if (!cancelled) router.replace("/dinnerdecider/randomize");
        }, 250);
      } catch (err) {
        setDone(true);
        setTimeout(() => {
          if (!cancelled) router.replace("/dinnerdecider/randomize");
        }, 250);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, router, setRestaurantsCache, location, mood, weather, preferences, timeCategory]);

  useEffect(() => {
    const timer = setInterval(() => setIdx((p) => (p + 1) % SANDWICH_STATES.length), 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100svh] bg-gradient-to-br from-teal-100 to-pink-100 text-gray-700">
      <motion.div
        key={idx}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.4 }}
        className="text-6xl"
      >
  {SANDWICH_STATES[idx] || "🍽️"}
      </motion.div>
      <p className="text-xl font-medium mt-3">Searching for tasty spots near you…</p>
      <p className="text-sm mt-1 text-gray-500">{done ? "Done!" : "Loading…"}</p>
    </div>
  );
}
