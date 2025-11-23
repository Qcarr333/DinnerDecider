"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { track } from "@/lib/track";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { getTimeCategory, getTimeCategoryForLocalDate } from "@/utils/timeContext";

const DinnerContext = createContext(null);

const LAYERS = ["region", "experience", "specialized", "distance"];
const WEATHER_TTL = 30 * 60 * 1000;
const WEATHER_FAIL_TTL = 10 * 60 * 1000;
const PLAN_AHEAD_STORAGE_KEY = "dd_plan_ahead_v1";

const DEFAULT_PLAN_AHEAD = {
  enabled: false,
  location: null,
  label: null,
  date: null,
  hour24: null,
  meridiem: "PM",
  utcOffsetMinutes: null,
  timeZoneId: null,
  isoString: null,
  timeCategory: null,
  placeId: null,
};

function createLayerState(mode = "any", selected = []) {
  return { mode, selected: new Set(selected) };
}

function createDefaultFilters() {
  return {
    region: createLayerState(),
    experience: createLayerState(),
    specialized: createLayerState(),
    distance: createLayerState(),
  };
}

function serializeFilters(filters) {
  const out = {};
  LAYERS.forEach((layer) => {
    const next = filters?.[layer];
    out[layer] = {
      mode: next?.mode === "custom" ? "custom" : "any",
      selected: Array.from(next?.selected || []),
    };
  });
  return out;
}

function hydrateFilters(raw) {
  if (!raw || typeof raw !== "object") return createDefaultFilters();
  const hydrated = {};
  LAYERS.forEach((layer) => {
    const row = raw[layer];
    if (row && typeof row === "object" && Array.isArray(row.selected)) {
      hydrated[layer] = createLayerState(row.mode === "custom" ? "custom" : "any", row.selected);
    } else if (Array.isArray(row)) {
      hydrated[layer] = createLayerState(row.length ? "custom" : "any", row);
    } else {
      hydrated[layer] = createLayerState();
    }
  });
  return hydrated;
}

export function DinnerProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dd_user") : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [filters, setFilters] = useState(createDefaultFilters);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsCache, setRestaurantsCache] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [location, setLocation] = useState(null);
  const supabaseRef = useRef(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [planAhead, setPlanAheadState] = useState(() => {
    if (typeof window === "undefined") return { ...DEFAULT_PLAN_AHEAD };
    try {
      const raw = localStorage.getItem(PLAN_AHEAD_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PLAN_AHEAD };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { ...DEFAULT_PLAN_AHEAD };
      const hour24 = Number.isFinite(parsed.hour24) ? parsed.hour24 : null;
      const utcOffsetMinutes = Number.isFinite(parsed.utcOffsetMinutes) ? parsed.utcOffsetMinutes : null;
      const meridiem = parsed.meridiem === "AM" || parsed.meridiem === "PM"
        ? parsed.meridiem
        : hour24 !== null && hour24 >= 12 ? "PM" : "AM";
      const timeCategoryOverride = parsed.timeCategory || (parsed.date && hour24 !== null
        ? getTimeCategoryForLocalDate(parsed.date, hour24, utcOffsetMinutes ?? 0)
        : null);
      return {
        ...DEFAULT_PLAN_AHEAD,
        ...parsed,
        hour24,
        meridiem,
        utcOffsetMinutes,
        timeCategory: timeCategoryOverride,
        enabled: !!parsed.enabled && !!parsed.location,
      };
    } catch {
      return { ...DEFAULT_PLAN_AHEAD };
    }
  });
  const [specialModeEnabled, setSpecialModeState] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("dd_special_mode");
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {}
    return false;
  });

  const updateSpecialMode = useCallback((nextEnabled) => {
    const enabled = Boolean(nextEnabled);
    setSpecialModeState(enabled);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("dd_special_mode", enabled ? "1" : "0"); } catch {}
    }
    try { track("special_mode_toggled", { enabled }); } catch {}
  }, []);
  const [r1Rerolls, setR1Rerolls] = useState(0);
  const [r2Rerolls, setR2Rerolls] = useState(0);
  const [r2Seed, setR2Seed] = useState(null);
  const [payments, setPayments] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dd_payments") || "[]"); } catch { return []; }
  });
  const [savedRestaurants, setSavedRestaurants] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dd_saved_restaurants") || "[]");
    } catch {
      return [];
    }
  });
  const [moodState, setMoodState] = useState(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("dd_mood") || "any" : "any";
    } catch {
      return "any";
    }
  });
  const [weather, setWeather] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("dd_weather_signal");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const weatherRef = useRef(null);
  const weatherRequestRef = useRef(null);
  const weatherFailureRef = useRef(null);
  const [preferences, setPreferences] = useState({ likes: [], dislikes: [] });
  const [prefsMeta, setPrefsMeta] = useState({ userId: null, fetchedAt: 0 });
  const [detectedTimeCategory, setDetectedTimeCategory] = useState(() => getTimeCategory());
  const firstCategoryAtRef = useRef(Date.now());
  const lastCategoryRef = useRef(detectedTimeCategory);
  const brunchLoggedRef = useRef(false);
  const lateLoggedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const client = getSupabaseBrowserClient();
    supabaseRef.current = client;
    setSupabaseConfigured(Boolean(client));
    if (!client) {
      setAuthReady(true);
      return;
    }
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setAuthUser(data?.session?.user || null);
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { brunchLoggedRef.current = sessionStorage.getItem("dd_brunch_logged") === "1"; } catch {}
    try { lateLoggedRef.current = sessionStorage.getItem("dd_late_logged") === "1"; } catch {}
  }, []);

  useEffect(() => {
    const category = detectedTimeCategory;
    if (!category) return;
    const iso = new Date().toISOString();
    try {
      track("time_category_detected", { category, iso });
      console.log(`🕒 TimeContext → ${category}`);
      if (category === "Brunch" && !brunchLoggedRef.current) {
        track("brunch_mode_triggered", { iso });
        brunchLoggedRef.current = true;
        try { sessionStorage.setItem("dd_brunch_logged", "1"); } catch {}
      }
      if (category === "Late Night" && !lateLoggedRef.current) {
        track("late_night_mode_triggered", { iso });
        lateLoggedRef.current = true;
        try { sessionStorage.setItem("dd_late_logged", "1"); } catch {}
      }
    } catch {}
    lastCategoryRef.current = category;
  }, [detectedTimeCategory]);

  useEffect(() => {
    firstCategoryAtRef.current = Date.now();
    const initial = getTimeCategory();
    lastCategoryRef.current = initial;
    setDetectedTimeCategory(initial);

    const checkCategory = () => {
      const next = getTimeCategory();
      if (!next || next === lastCategoryRef.current) return;
      const now = Date.now();
      if (now - firstCategoryAtRef.current >= 30 * 60 * 1000) {
        try {
          track("time_category_transition", {
            from: lastCategoryRef.current,
            to: next,
            minutesOpen: Math.round((now - firstCategoryAtRef.current) / 60000),
          });
        } catch {}
      }
      lastCategoryRef.current = next;
      setDetectedTimeCategory(next);
    };

    const quickCheck = setTimeout(checkCategory, 5000);
    const interval = setInterval(checkCategory, 5 * 60 * 1000);
    return () => {
      clearTimeout(quickCheck);
      clearInterval(interval);
    };
  }, []);

  function saveRestaurant(r) {
    const updated = [...savedRestaurants, r];
    setSavedRestaurants(updated);
    try { localStorage.setItem("dd_saved_restaurants", JSON.stringify(updated)); } catch {}
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dd_filters_v2") || localStorage.getItem("dd_filters");
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters(hydrateFilters(parsed));
      }
      if (localStorage.getItem("dd_filters")) localStorage.removeItem("dd_filters");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dd_filters_v2", JSON.stringify(serializeFilters(filters)));
    } catch {}
  }, [filters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Array.isArray(restaurantsCache)) return;
    try {
      if (restaurantsCache.length) {
        localStorage.setItem("dd_last_shortlist", JSON.stringify(restaurantsCache));
      } else {
        localStorage.removeItem("dd_last_shortlist");
      }
    } catch {}
  }, [restaurantsCache]);

  useEffect(() => {
    try { localStorage.setItem("dd_user", JSON.stringify(user)); } catch {}
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(PLAN_AHEAD_STORAGE_KEY, JSON.stringify(planAhead)); } catch {}
  }, [planAhead]);

  useEffect(() => {
    let cancelled = false;
    if (!authUser) {
      setProfile(null);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/profile?userId=${authUser.id}`, { cache: "no-store" });
        let profileData = null;
        if (res.ok) {
          const payload = await res.json();
          profileData = payload?.profile || null;
        }
        if (!profileData) {
          const upsertRes = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: authUser.id,
              username: authUser.email?.split("@")[0] || "Foodie",
            }),
          });
          if (upsertRes.ok) {
            const payload = await upsertRes.json();
            profileData = payload?.profile || null;
          }
        }
        if (cancelled) return;
        setProfile(profileData);
        const enriched = {
          id: authUser.id,
          email: authUser.email,
          phone: authUser.phone,
          name: profileData?.username || authUser.email?.split("@")[0] || "Foodie",
          premium: (profileData?.tier || "free") !== "free",
          tier: profileData?.tier || "free",
          supabase: true,
          profile: profileData,
        };
        setUser(enriched);
      } catch (error) {
        if (!cancelled) console.warn("supabase_profile_sync_error", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    try { localStorage.setItem("dd_payments", JSON.stringify(payments)); } catch {}
  }, [payments]);

  useEffect(() => {
    try { localStorage.setItem("dd_mood", moodState); } catch {}
  }, [moodState]);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  const ensureWeather = useCallback(async (lat, lng) => {
    if (!lat || !lng) return null;
    const cached = weatherRef.current;
    const now = Date.now();
    if (cached && cached.lat === lat && cached.lng === lng && cached.fetchedAt && now - cached.fetchedAt < WEATHER_TTL) {
      return cached;
    }

    const recentFailure = weatherFailureRef.current;
    if (recentFailure && now - recentFailure.at < WEATHER_FAIL_TTL) {
      return null;
    }

    if (weatherRequestRef.current) {
      return weatherRequestRef.current;
    }

    const request = (async () => {
      const startedAt = Date.now();
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`, { cache: "no-store" });
        if (res.status === 401) {
          weatherFailureRef.current = { at: Date.now(), status: 401 };
          console.warn("weather_fetch_error", "unauthorized");
          return null;
        }
        if (!res.ok) {
          weatherFailureRef.current = { at: Date.now(), status: res.status };
          console.warn("weather_fetch_error", `status_${res.status}`);
          return null;
        }
        const data = await res.json();
        const payload = { ...data, lat, lng, fetchedAt: startedAt };
        weatherFailureRef.current = null;
        setWeather(payload);
        try { sessionStorage.setItem("dd_weather_signal", JSON.stringify(payload)); } catch {}
        try { track("weather_signal_applied", { bucket: data?.bucket, condition: data?.condition, tempC: data?.temperatureC }); } catch {}
        return payload;
      } catch (err) {
        weatherFailureRef.current = { at: Date.now(), status: "network" };
        console.warn("weather_fetch_error", err);
        return null;
      }
    })();

    weatherRequestRef.current = request;
    const result = await request;
    weatherRequestRef.current = null;
    if (result) {
      weatherRef.current = result;
    }
    return result;
  }, [setWeather]);

  const refreshPreferences = useCallback(async (userId) => {
    if (!userId) return null;
    const now = Date.now();
    const cacheKey = `dd_user_prefs_${userId}`;
    if (prefsMeta.userId === userId && prefsMeta.fetchedAt && now - prefsMeta.fetchedAt < 10 * 60 * 1000) {
      return preferences;
    }
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.likes && now - (cached?.fetchedAt || 0) < 6 * 60 * 60 * 1000) {
          setPreferences({ likes: cached.likes || [], dislikes: cached.dislikes || [] });
          setPrefsMeta({ userId, fetchedAt: now });
          return cached;
        }
      }
    } catch {}
    try {
      const res = await fetch(`/api/preferences?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`prefs_fetch_failed_${res.status}`);
      const data = await res.json();
      const likes = Array.isArray(data?.likes) ? data.likes : [];
      const dislikes = Array.isArray(data?.dislikes) ? data.dislikes : [];
      const payload = { likes, dislikes };
      setPreferences(payload);
      setPrefsMeta({ userId, fetchedAt: now });
      try { localStorage.setItem(cacheKey, JSON.stringify({ ...payload, fetchedAt: now })); } catch {}
      return payload;
    } catch (err) {
      console.warn("prefs_fetch_error", err);
      return null;
    }
  }, [prefsMeta, preferences]);

  useEffect(() => {
    if (user?.id) {
      refreshPreferences(user.id);
    }
  }, [user?.id, refreshPreferences]);

  const setMood = useCallback((nextMood) => {
    setMoodState(nextMood || "any");
    try { track("mood_selected", { mood: nextMood || "any" }); } catch {}
  }, []);

  const updateAuthUser = useCallback(async (attributes = {}) => {
    const client = supabaseRef.current;
    if (!client || !authUser) return null;
    const { data, error } = await client.auth.updateUser(attributes);
    if (error) throw error;
    if (data?.user) {
      setAuthUser(data.user);
      setUser((prev) => {
        if (!prev || !prev.supabase) return prev;
        return {
          ...prev,
          email: data.user.email,
          phone: data.user.phone,
        };
      });
    }
    return data?.user || null;
  }, [authUser]);

  const updateProfile = useCallback(async (updates = {}) => {
    if (!authUser) return null;
    const preferences = updates.preferences === undefined ? profile?.preferences ?? null : updates.preferences;
    const insights = updates.insights === undefined ? profile?.insights ?? null : updates.insights;
    const payload = {
      userId: authUser.id,
      username: updates.username ?? profile?.username ?? (authUser.email?.split("@")[0] || "Foodie"),
      tier: updates.tier ?? profile?.tier ?? "free",
      aiSummary: updates.aiSummary ?? profile?.aiSummary ?? null,
      preferences,
      insights,
      lastActiveAt: updates.lastActiveAt ?? profile?.lastActiveAt ?? new Date().toISOString(),
    };

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`profile_upsert_failed_${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    const nextProfile = data?.profile || payload;
    setProfile(nextProfile);
    setUser((prev) => ({
      ...(prev && prev.supabase ? prev : {}),
      id: authUser.id,
      email: authUser.email,
      phone: authUser.phone,
      name: nextProfile?.username || authUser.email?.split("@")[0] || "Foodie",
      premium: (nextProfile?.tier || "free") !== "free",
      tier: nextProfile?.tier || "free",
      supabase: true,
      profile: nextProfile,
    }));
    return nextProfile;
  }, [authUser, profile]);

  const signOut = useCallback(async () => {
    try {
      await supabaseRef.current?.auth.signOut();
    } catch (err) {
      console.warn("supabase_signout_error", err);
    } finally {
      setAuthUser(null);
      setProfile(null);
      setUser(null);
      try { localStorage.removeItem("dd_user"); } catch {}
    }
  }, []);

  const applyPlanAhead = useCallback((payload) => {
    if (!payload || !payload.location) {
      setPlanAheadState({ ...DEFAULT_PLAN_AHEAD });
      return;
    }
    const lat = Number(payload.location.lat);
    const lng = Number(payload.location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPlanAheadState({ ...DEFAULT_PLAN_AHEAD });
      return;
    }
    const date = typeof payload.date === "string" && payload.date ? payload.date : null;
    const hour24 = Number.isFinite(payload.hour24) ? payload.hour24 : null;
    const offset = Number.isFinite(payload.utcOffsetMinutes) ? payload.utcOffsetMinutes : null;
    const meridiem = payload.meridiem === "AM" || payload.meridiem === "PM"
      ? payload.meridiem
      : hour24 !== null && hour24 >= 12 ? "PM" : "AM";
    const timeCategoryOverride = payload.timeCategory || (date && hour24 !== null
      ? getTimeCategoryForLocalDate(date, hour24, offset ?? 0)
      : null);

    setPlanAheadState({
      ...DEFAULT_PLAN_AHEAD,
      enabled: true,
      location: { lat, lng },
      label: payload.label || payload.formattedAddress || null,
      date,
      hour24,
      meridiem,
      utcOffsetMinutes: offset,
      timeZoneId: payload.timeZoneId || null,
      isoString: payload.isoString || null,
      timeCategory: timeCategoryOverride,
      placeId: payload.placeId || null,
    });
    try {
      track("plan_ahead_applied", {
        hasOffset: Number.isFinite(offset),
        timeCategory: timeCategoryOverride,
      });
    } catch {}
  }, []);

  const clearPlanAhead = useCallback(() => {
    setPlanAheadState({ ...DEFAULT_PLAN_AHEAD });
    try { track("plan_ahead_cleared"); } catch {}
  }, []);

  const activeLocation = planAhead?.enabled && planAhead.location ? planAhead.location : location;
  const effectiveTimeCategory = planAhead?.enabled && planAhead.timeCategory ? planAhead.timeCategory : detectedTimeCategory;
  const value = useMemo(
    () => ({
      user,
      setUser,
      filters,
      setFilters,
      restaurants,
      setRestaurants,
      restaurantsCache,
      setRestaurantsCache,
      selectedCombo,
      setSelectedCombo,
      location,
      setLocation,
      r1Rerolls,
      setR1Rerolls,
      r2Rerolls,
      setR2Rerolls,
      r2Seed,
      setR2Seed,
      payments,
      setPayments,
      savedRestaurants,
      setSavedRestaurants,
      saveRestaurant,
      mood: moodState,
      setMood,
      ensureWeather,
      weather,
      preferences,
      refreshPreferences,
      timeCategory: effectiveTimeCategory,
      baseTimeCategory: detectedTimeCategory,
      planAhead,
      applyPlanAhead,
      clearPlanAhead,
      activeLocation,
      supabaseClient: supabaseRef.current,
      authUser,
      supabaseProfile: profile,
      updateProfile,
      updateAuthUser,
      signOut,
      authReady,
      supabaseConfigured,
      specialModeEnabled,
      setSpecialModeEnabled: updateSpecialMode,
    }),
    [
      user,
      filters,
      restaurants,
      restaurantsCache,
      selectedCombo,
      location,
      r1Rerolls,
      r2Rerolls,
      r2Seed,
      payments,
      savedRestaurants,
      moodState,
      ensureWeather,
      weather,
      preferences,
      setMood,
      refreshPreferences,
      effectiveTimeCategory,
      detectedTimeCategory,
      planAhead,
      applyPlanAhead,
      clearPlanAhead,
      activeLocation,
      authUser,
      profile,
      updateProfile,
      updateAuthUser,
      signOut,
      authReady,
      supabaseConfigured,
      specialModeEnabled,
      updateSpecialMode,
    ]
  );

  return <DinnerContext.Provider value={value}>{children}</DinnerContext.Provider>;
}

export function useDinner() {
  const ctx = useContext(DinnerContext);
  if (!ctx) throw new Error("useDinner must be used within DinnerProvider");
  return ctx;
}
