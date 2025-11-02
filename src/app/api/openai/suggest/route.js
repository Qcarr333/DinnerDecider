import { NextResponse } from "next/server";
import { FOOD_TYPES } from "@/data/foodTypes";

const suggestionCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function summarizeFilters(filters = {}) {
  try {
    const layers = Object.entries(filters)
      .map(([layer, config]) => {
        if (!config) return null;
        const mode = config.mode || "any";
        const selected = Array.isArray(config.selected) ? config.selected : [];
        return `${layer}:${mode}${selected.length ? `(${selected.join(",")})` : ""}`;
      })
      .filter(Boolean)
      .join(" | ");
    return layers || "none";
  } catch {
    return "none";
  }
}

function fallbackSuggestions({ mood, weatherHint, timeCategory, prefs }) {
  const likes = Array.isArray(prefs?.likes) ? prefs.likes : [];
  const dislikes = new Set((Array.isArray(prefs?.dislikes) ? prefs.dislikes : []).map((d) => String(d).toLowerCase()));
  const pool = [...FOOD_TYPES.specialized.map((x) => x.label), ...FOOD_TYPES.region.map((x) => x.label)];
  const filteredPool = pool.filter((label) => !dislikes.has(label.toLowerCase()));
  const base = likes.length ? likes : filteredPool.slice(0, 6);
  const picks = Array.from({ length: 3 }, (_, idx) => base[idx % base.length] || filteredPool[idx % filteredPool.length]).map((label) => `${label} spot`);
  const moodText = mood && mood !== "any" ? mood : "balanced";
  const insightParts = [
    `Blending a ${moodText} mood`,
    weatherHint ? `weather cue (“${weatherHint}”)` : null,
    timeCategory ? `and ${timeCategory.toLowerCase()} timing` : null,
  ].filter(Boolean);
  return {
    suggestions: picks,
    insight: insightParts.length ? `${insightParts.join(", ")} for fresh picks.` : "Quick sampler based on active filters.",
    source: "fallback",
  };
}

export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { filters = {}, mood = "any", weather = null, prefs = {}, timeCategory = null } = body;
  const weatherHint = weather?.weatherHint || weather?.condition || weather?.bucket || null;
  const cacheKey = JSON.stringify({ filters, mood, weatherHint, prefs, timeCategory });
  const now = Date.now();
  const cached = suggestionCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json({ ...cached.payload, cached: true });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const payload = fallbackSuggestions({ mood, weatherHint, timeCategory, prefs });
    suggestionCache.set(cacheKey, { expiresAt: now + CACHE_TTL, payload });
    return NextResponse.json(payload, { status: 200 });
  }

  const instructions = `You are DinnerDecider's contextual dining assistant. Consider:
Mood: ${mood || "any"}
Weather hint: ${weatherHint || "none"}
Time category: ${timeCategory || "none"}
User likes: ${(Array.isArray(prefs?.likes) ? prefs.likes : []).join(", ") || "none"}
User dislikes: ${(Array.isArray(prefs?.dislikes) ? prefs.dislikes : []).join(", ") || "none"}
Filters snapshot: ${summarizeFilters(filters)}
Return JSON with keys "suggestions" (array of 3 short strings combining cuisine + vibe) and "insight" (1 sentence).
Keep suggestions <= 6 words each and avoid repeats. JSON only.`;

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: instructions,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("openai_suggest_error", res.status, await res.text().catch(() => ""));
      const payload = fallbackSuggestions({ mood, weatherHint, timeCategory, prefs });
      suggestionCache.set(cacheKey, { expiresAt: now + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, source: "fallback" }, { status: 200 });
    }

    const data = await res.json();
    const parsed = (() => {
      try {
        if (data?.output?.[0]?.content?.[0]?.text) {
          return JSON.parse(data.output[0].content[0].text);
        }
        if (data?.output_text) {
          return JSON.parse(data.output_text);
        }
        return null;
      } catch {
        return null;
      }
    })();

    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 3).map(String) : [];
    const insight = typeof parsed?.insight === "string" ? parsed.insight : "Contextual picks generated via OpenAI.";

    const payload = {
      suggestions,
      insight,
      source: "openai",
    };

    suggestionCache.set(cacheKey, { expiresAt: now + CACHE_TTL, payload });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("openai_suggest_exception", err);
    const payload = fallbackSuggestions({ mood, weatherHint, timeCategory, prefs });
    suggestionCache.set(cacheKey, { expiresAt: now + CACHE_TTL, payload });
    return NextResponse.json({ ...payload, source: "fallback" }, { status: 200 });
  }
}
