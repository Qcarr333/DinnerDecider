export function isFridaySixPM(date = new Date()) {
  return date.getDay() === 5 && date.getHours() === 18;
}

export function getTopRestaurant(saved = []) {
  if (!Array.isArray(saved) || !saved.length) return null;
  const best = [...saved].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  return best || null;
}

export function scheduleWeeklyDigest(enabled) {
  if (!enabled) return;
  try {
    const lastRaw = localStorage.getItem("dd_notifications");
    const last = lastRaw ? JSON.parse(lastRaw) : { lastSent: 0 };
    const now = Date.now();
    const saved = JSON.parse(localStorage.getItem("dd_saved_restaurants") || "[]");
    const top = getTopRestaurant(saved);
    // Simulate: if Friday 6 PM local or never sent
    const d = new Date();
    if (isFridaySixPM(d) || !last.lastSent) {
      console.log(`🍕 Your week in bites – Top pick: ${top?.name || "TBD"} ⭐ ${top?.rating || "N/A"}`);
      localStorage.setItem("dd_notifications", JSON.stringify({ lastSent: now }));
      return true;
    }
  } catch {}
  return false;
}

