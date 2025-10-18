"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DinnerContext = createContext(null);

export function DinnerProvider({ children }) {
  // User profile (premium/referrals/code)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("dd_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [filters, setFilters] = useState({
    region: new Set(),
    experience: new Set(),
    specialized: new Set(),
    distance: new Set(),
  });
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsCache, setRestaurantsCache] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null); // {region, experience, specialized, distance}
  const [location, setLocation] = useState(null); // {lat, lng}
  const [r1Rerolls, setR1Rerolls] = useState(0);
  const [r2Rerolls, setR2Rerolls] = useState(0);
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

  function saveRestaurant(r) {
    const updated = [...savedRestaurants, r];
    setSavedRestaurants(updated);
    try { localStorage.setItem("dd_saved_restaurants", JSON.stringify(updated)); } catch {}
  }

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dd_filters");
      if (raw) {
        const parsed = JSON.parse(raw);
        setFilters({
          region: new Set(parsed.region || []),
          experience: new Set(parsed.experience || []),
          specialized: new Set(parsed.specialized || []),
          distance: new Set(parsed.distance || []),
        });
      }
    } catch {}
  }, []);

  // Persist to localStorage when filters change
  useEffect(() => {
    const obj = {
      region: Array.from(filters.region),
      experience: Array.from(filters.experience),
      specialized: Array.from(filters.specialized),
      distance: Array.from(filters.distance),
    };
    try {
      localStorage.setItem("dd_filters", JSON.stringify(obj));
    } catch {}
  }, [filters]);

  // Persist user updates
  useEffect(() => {
    try { localStorage.setItem("dd_user", JSON.stringify(user)); } catch {}
  }, [user]);

  // Sync payments
  useEffect(() => {
    try { localStorage.setItem("dd_payments", JSON.stringify(payments)); } catch {}
  }, [payments]);

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
      payments,
      setPayments,
      savedRestaurants,
      setSavedRestaurants,
      saveRestaurant,
    }),
    [user, filters, restaurants, restaurantsCache, selectedCombo, location, r1Rerolls, r2Rerolls, payments, savedRestaurants]
  );

  return <DinnerContext.Provider value={value}>{children}</DinnerContext.Provider>;
}

export function useDinner() {
  const ctx = useContext(DinnerContext);
  if (!ctx) throw new Error("useDinner must be used within DinnerProvider");
  return ctx;
}
