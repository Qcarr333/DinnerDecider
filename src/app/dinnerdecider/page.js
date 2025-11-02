"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FiltersGrid from "@/components/FiltersGrid";
import MoodSelector from "@/components/MoodSelector";
import { useDinner } from "@/context/DinnerContext";
import { track } from "@/lib/track";
import { FOOD_TYPES } from "@/data/foodTypes";
import { suggestSmart } from "@/lib/aiRecommender";
import { motion, AnimatePresence } from "framer-motion";

const LAYERS = ["region", "experience", "specialized", "distance"];

function toPending(filters) {
  const next = {};
  LAYERS.forEach((layer) => {
    const row = filters?.[layer];
    if (row && typeof row === "object") {
      const mode = row.mode === "custom" ? "custom" : "any";
      const selected = row.selected instanceof Set ? Array.from(row.selected) : Array.isArray(row.selected) ? row.selected : [];
      next[layer] = { mode, selected };
    } else {
      next[layer] = { mode: "any", selected: [] };
    }
  });
  return next;
}

function toContextFilters(pending) {
  const payload = {};
  LAYERS.forEach((layer) => {
    const row = pending?.[layer] || { mode: "any", selected: [] };
    const mode = row.mode === "custom" ? "custom" : "any";
    const selected = Array.isArray(row.selected) ? row.selected : [];
    payload[layer] = {
      mode,
      selected: new Set(mode === "custom" ? selected : []),
    };
  });
  return payload;
}

export default function Dashboard() {
  const router = useRouter();
  const {
    filters,
    setFilters,
    setLocation,
    user,
    mood,
    setMood,
    ensureWeather,
    weather,
    preferences,
    refreshPreferences,
    timeCategory,
  } = useDinner();
  const [locStatus, setLocStatus] = useState("detect"); // detect | ok | fail
  const [pending, setPending] = useState(() => toPending(filters));
  const [hydrated, setHydrated] = useState(false);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionInsight, setSuggestionInsight] = useState("");
  const weatherSummary = useMemo(() => {
    if (!weather) return null;
    const temp = typeof weather.temperatureF === "number" ? `${Math.round(weather.temperatureF)}°F` : null;
    const condition = weather.condition ? weather.condition : null;
    return [temp, condition].filter(Boolean).join(" • ");
  }, [weather]);

  useEffect(() => {
    setPending(toPending(filters));
  }, [filters]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Prompt geolocation on mount
  useEffect(() => {
    let active = true;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setLocStatus("detect");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!active) return;
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocStatus("ok");
          ensureWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (!active) return;
          setLocStatus("fail");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocStatus("fail");
    }
    return () => { active = false; };
  }, [setLocation, ensureWeather]);

  useEffect(() => {
    if (user?.id) refreshPreferences(user.id);
  }, [user?.id, refreshPreferences]);

  const handleLetsEat = () => {
    try { track("lets_eat_clicked"); } catch {}
    try {
      const arr = JSON.parse(localStorage.getItem("dd_decision_times") || "[]");
      arr.push(Date.now());
      localStorage.setItem("dd_decision_times", JSON.stringify(arr.slice(-200)));
    } catch {}
    setFilters(toContextFilters(pending));
    router.push("/dinnerdecider/fetch");
  };

  const handleSmartSuggest = async () => {
    try { track("ai_suggestion_clicked"); } catch {}
    setSuggestOpen(true);
  setSuggestionInsight("");
    try {
      const res = await fetch("/api/openai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filters: pending, mood, weather, prefs: preferences, timeCategory }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.suggestions) && data.suggestions.length) {
          setSuggestions(data.suggestions);
          setSuggestionInsight(typeof data?.insight === "string" ? data.insight : "");
          try { track("ai_suggestion_generated", { source: data?.source || "openai_route", suggestions: data.suggestions.length }); } catch {}
          return;
        }
      }
      throw new Error("openai_fallback");
    } catch (err) {
      const savedRaw = localStorage.getItem("dd_saved_restaurants");
      const saved = savedRaw ? JSON.parse(savedRaw) : [];
      const sugg = await suggestSmart({
        specialized: new Set(pending.specialized),
        region: new Set(pending.region),
      }, saved, { mood, weather, prefs: preferences, timeCategory });
      setSuggestions(Object.values(sugg?.labels || {}));
      setSuggestionInsight("Local AI blend based on your mood, weather, and time context.");
      try { track("ai_suggestion_generated", { source: "local_fallback", suggestions: Object.values(sugg?.labels || {}).length }); } catch {}
    }
  };

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-teal-500 via-sky-500 to-rose-400">
      <title>DinnerDecider – Dashboard</title>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-sm">
            DinnerDecider <span className="text-white/80 text-lg font-normal">(FoodSpin)</span>
          </h1>
          <p className="text-white/90 mt-1">Quickly pick where to eat with smart filters.</p>
          {locStatus === "detect" && (
            <p className="text-white/80 text-sm mt-1">Detecting location…</p>
          )}
          {locStatus === "fail" && (
            <p className="text-white/80 text-sm mt-1">Using default location. Enable location services for better results.</p>
          )}
          {hydrated && weatherSummary ? (
            <p className="text-white/80 text-sm mt-1">Weather tuned: {weatherSummary}</p>
          ) : null}
        </header>

        <div className="rounded-3xl bg-white/10 backdrop-blur-md shadow-xl p-5 md:p-8">
          <div className="mb-5">
            <h2 className="text-white text-lg font-semibold">Choose what you’re craving</h2>
            <p className="text-white/80 text-sm">Grouped by Region, Experience, Specialized, and Location.</p>
          </div>

          <MoodSelector value={mood} onChange={setMood} />

          <FiltersGrid
            initial={pending}
            onChange={(next) => setPending(next)}
          />

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleLetsEat}
              className="inline-flex items-center gap-2 rounded-full bg-white text-teal-700 hover:text-teal-800 hover:shadow-lg px-6 py-3 font-semibold transition"
            >
              <span className="text-lg">🍽️</span>
              <span>Let’s Eat!</span>
            </button>
            <button
              onClick={handleSmartSuggest}
              disabled={!user?.premium}
              className="ml-3 inline-flex items-center gap-2 rounded-full bg-white text-teal-700 hover:text-teal-800 hover:shadow-lg px-6 py-3 font-semibold transition disabled:opacity-60"
              title={!user?.premium ? "Premium feature" : "Smart suggestions"}
            >
              <span className="text-lg">🤖</span>
              <span>Smart Suggest</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {suggestOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 grid place-items-center z-50"
            onClick={() => setSuggestOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Suggested cuisines</h3>
              <ul className="list-disc pl-5 space-y-1">
                {suggestions.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    {s}
                  </motion.li>
                ))}
              </ul>
              {suggestionInsight ? <p className="mt-3 text-sm text-gray-600">{suggestionInsight}</p> : null}
              <div className="mt-4 text-right">
                <button className="rounded-lg px-4 py-1.5 bg-teal-600 text-white" onClick={() => setSuggestOpen(false)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
