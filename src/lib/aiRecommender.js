import { FOOD_TYPES } from "@/data/foodTypes";

function safeParseLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function pickWeighted(items) {
  const total = items.reduce((s, x) => s + (x.w || 1), 0);
  let r = Math.random() * (total || 1);
  for (const it of items) {
    r -= (it.w || 1);
    if (r <= 0) return it.v;
  }
  return items[0]?.v;
}

export async function suggestSmart(filters, savedRestaurants, opts = {}) {
  const { mood = "any", weather = null, prefs = {}, timeCategory = null } = opts || {};
  // Signals
  const weights = (typeof window !== "undefined") ? safeParseLocal("dd_feedback_weights", { region: {}, specialized: {} }) : { region: {}, specialized: {} };
  const rerollHistory = (typeof window !== "undefined") ? safeParseLocal("dd_reroll_history", []) : [];
  const decisions = (typeof window !== "undefined") ? safeParseLocal("dd_decision_times", []) : [];

  // Time-of-day influence
  const hour = new Date().getHours();
  const tod = hour < 11 ? "morning" : hour < 16 ? "afternoon" : hour < 22 ? "evening" : "late";

  // Basic pools from selected filters or full list
  const sel = (s, all) => {
    const arr = Array.from(s || []);
    return arr.length ? arr : all.map((x) => x.id);
  };
  const regionPool = sel(filters?.region, FOOD_TYPES.region);
  const expPool = sel(filters?.experience, FOOD_TYPES.experience);
  const specPool = sel(filters?.specialized, FOOD_TYPES.specialized);
  const distPool = sel(filters?.distance, FOOD_TYPES.distance);

  // Build weighted candidates for region and specialized
  const regWeights = regionPool.map((id) => ({ v: id, w: 1 + (weights.region[id] || 0) }));
  const specWeights = specPool.map((id) => ({ v: id, w: 1 + (weights.specialized[id] || 0) }));

  // Saved restaurants hinting
  const hints = new Set();
  (savedRestaurants || []).forEach((r) => {
    const hay = `${(r?.name || "").toLowerCase()} ${(r?.address || "").toLowerCase()}`;
    FOOD_TYPES.specialized.forEach((sp) => { if (hay.includes(sp.label.toLowerCase())) hints.add(sp.id); });
    FOOD_TYPES.region.forEach((rg) => { if (hay.includes(rg.label.toLowerCase())) hints.add(rg.id); });
  });
  specWeights.forEach((it) => { if (hints.has(it.v)) it.w += 1.5; });

  // Reroll history penalty: downweight previously skipped combos
  rerollHistory.slice(-50).forEach((c) => {
    if (c?.region && weights.region[c.region] !== undefined) weights.region[c.region] -= 0.2;
    if (c?.specialized && weights.specialized[c.specialized] !== undefined) weights.specialized[c.specialized] -= 0.2;
  });

  // Time-of-day nudge toward breakfast/dessert/takeout
  const expBoost = new Map([ ["cafe", 0.8], ["dessert_bar", 0.8], ["takeout", 0.6] ]);
  const specBoostMorning = new Map([["coffee", 1.0], ["dessert", 0.4]]);
  const specBoostNight = new Map([["dessert", 0.8], ["noodles", 0.4]]);

  const expCandidates = expPool.map((id) => ({ v: id, w: 1 }));
  if (tod === "morning") expCandidates.forEach((x) => { x.w += expBoost.get(x.v) || 0; });
  if (tod === "late") expCandidates.forEach((x) => { x.w += (x.v === "takeout" ? 0.6 : 0); });

  const specCandidates = specWeights.map((x) => ({ ...x }));
  const idToLabel = new Map([
    ...FOOD_TYPES.region.map((x) => [x.id, x.label]),
    ...FOOD_TYPES.experience.map((x) => [x.id, x.label]),
    ...FOOD_TYPES.specialized.map((x) => [x.id, x.label]),
    ...FOOD_TYPES.distance.map((x) => [x.id, x.label]),
  ]);

  const moodSpecializedBoosts = new Map([
    ["comfort", [["ramen", 1.2], ["noodles", 1.1], ["pasta", 1.1], ["soup", 1.1]]],
    ["adventurous", [["fusion", 1.3], ["chef_special", 1.2], ["korean", 1.1]]],
    ["healthy", [["salad", 1.3], ["vegetarian", 1.2], ["poke", 1.2], ["mediterranean", 1.1]]],
    ["fast", [["street_food", 1.2], ["tacos", 1.1], ["burgers", 1.05]]],
    ["celebration", [["steakhouse", 1.3], ["seafood", 1.25], ["wine_bar", 1.1]]],
  ]);

  const weatherSpecializedBoosts = new Map([
    ["cold", [["ramen", 1.3], ["hot_pot", 1.2], ["pho", 1.2], ["bbq", 1.1]]],
    ["rain", [["soup", 1.3], ["comfort", 1.2]]],
    ["hot", [["ice_cream", 1.4], ["salad", 1.2], ["smoothies", 1.2]]],
    ["humid", [["smoothies", 1.3], ["poke", 1.2]]],
  ]);

  const applyLabelBoosts = (candidates, boosts) => {
    if (!boosts) return;
    for (const [labelKey, weight] of boosts) {
      candidates.forEach((cand) => {
        const label = idToLabel.get(cand.v)?.toLowerCase() || "";
        if (label.includes(labelKey.replace(/_/g, " "))) {
          cand.w = (cand.w || 1) * weight;
        }
      });
    }
  };

  applyLabelBoosts(specCandidates, moodSpecializedBoosts.get(mood));
  if (weather?.bucket) applyLabelBoosts(specCandidates, weatherSpecializedBoosts.get(weather.bucket));

  const timeCategoryBoosts = {
    "Early Riser": {
      experience: [["cafe", 1.3], ["takeout", 1.1]],
      specialized: [["coffee", 1.5], ["smoothies", 1.3], ["sandwich", 1.15]],
    },
    Breakfast: {
      experience: [["cafe", 1.25]],
      specialized: [["coffee", 1.4], ["dessert", 1.1], ["smoothies", 1.15]],
    },
    Lunch: {
      experience: [["casual", 1.15], ["takeout", 1.2]],
      specialized: [["sandwich", 1.3], ["salad", 1.25], ["pizza", 1.1]],
    },
    Snack: {
      experience: [["dessert_bar", 1.3], ["cafe", 1.2]],
      specialized: [["dessert", 1.4], ["coffee", 1.2], ["smoothies", 1.35]],
    },
    Dinner: {
      experience: [["fine", 1.2], ["casual", 1.1]],
      specialized: [["steak", 1.35], ["seafood", 1.3], ["bbq", 1.15]],
    },
    Brunch: {
      experience: [["brunch", 1.6], ["cafe", 1.25]],
      specialized: [["coffee", 1.2], ["smoothies", 1.2], ["salad", 1.15]],
    },
    "Late Night": {
      experience: [["pub", 1.3], ["takeout", 1.25]],
      specialized: [["noodles", 1.3], ["wings", 1.4], ["burger", 1.2], ["bbq", 1.15]],
    },
  };

  const applyTimeBoosts = (candidates, boosts) => {
    if (!boosts) return;
    for (const [id, weight] of boosts) {
      candidates.forEach((cand) => {
        if (cand.v === id) {
          cand.w = (cand.w || 1) * weight;
        }
      });
    }
  };

  if (timeCategory && timeCategoryBoosts[timeCategory]) {
    applyTimeBoosts(expCandidates, timeCategoryBoosts[timeCategory]?.experience);
    applyTimeBoosts(specCandidates, timeCategoryBoosts[timeCategory]?.specialized);
  }

  const likes = Array.isArray(prefs?.likes) ? prefs.likes : [];
  const dislikes = Array.isArray(prefs?.dislikes) ? prefs.dislikes : [];
  if (likes.length) {
    specCandidates.forEach((cand) => {
      const label = (idToLabel.get(cand.v) || "").toLowerCase();
      if (likes.some((like) => label.includes(String(like).toLowerCase()))) {
        cand.w = (cand.w || 1) * 1.3;
      }
    });
  }
  if (dislikes.length) {
    specCandidates.forEach((cand) => {
      const label = (idToLabel.get(cand.v) || "").toLowerCase();
      if (dislikes.some((d) => label.includes(String(d).toLowerCase()))) {
        cand.w = Math.max((cand.w || 1) * 0.4, 0.1);
      }
    });
  }
  if (tod === "morning") specCandidates.forEach((x) => { x.w += specBoostMorning.get(x.v) || 0; });
  if (tod === "late") specCandidates.forEach((x) => { x.w += specBoostNight.get(x.v) || 0; });

  // Distance simple pick
  const distCandidates = distPool.map((id) => ({ v: id, w: 1 }));

  // Final picks
  const region = pickWeighted(regWeights);
  const experience = pickWeighted(expCandidates);
  const specialized = pickWeighted(specCandidates);
  const distance = pickWeighted(distCandidates);

  // Confidence heuristic
  const conf = 0.5
    + Math.min(0.3, (weights.region[region] || 0) * 0.1)
    + Math.min(0.3, (weights.specialized[specialized] || 0) * 0.1)
    + (hints.has(specialized) ? 0.1 : 0)
    + (tod === "morning" || tod === "late" ? 0.05 : 0);

  const combo = { region, experience, specialized, distance };
  const labeled = {
    Region: idToLabel.get(region),
    Experience: idToLabel.get(experience),
    Specialized: idToLabel.get(specialized),
    Location: idToLabel.get(distance),
  };

  try { console.log("🤖 AI Suggested Combo:", labeled, "confidence:", Number(conf.toFixed(2)), "time:", timeCategory); } catch {}
  return { combo, labels: labeled, confidence: Number(conf.toFixed(2)) };
}

export default suggestSmart;
