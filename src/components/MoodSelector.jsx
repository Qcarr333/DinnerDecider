"use client";

import * as Lucide from "lucide-react";

const MOODS = [
  { id: "any", label: "Surprise Me", icon: "Sparkles", hint: "Default" },
  { id: "comfort", label: "Comfort", icon: "MugHot", hint: "Cozy, hearty picks" },
  { id: "adventurous", label: "Adventurous", icon: "Compass", hint: "Spicy or new" },
  { id: "healthy", label: "Healthy", icon: "Leaf", hint: "Light & fresh" },
  { id: "fast", label: "Fast", icon: "Timer", hint: "Quick bites" },
  { id: "celebration", label: "Celebration", icon: "PartyPopper", hint: "Night-out energy" },
  { id: "drinks", label: "Drinks", icon: "Wine", hint: "Bars & lounges" },
];

export default function MoodSelector({ value = "any", onChange }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Tonight’s vibe</h3>
          <p className="text-white/70 text-xs">Fine-tune recommendations with mood-aware nudges.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => {
          const Icon = Lucide[mood.icon] || Lucide.Smile;
          const active = value === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onChange?.(mood.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                active
                  ? "bg-white text-teal-700 border-white shadow"
                  : "bg-white/10 border-white/30 text-white/80 hover:bg-white/20"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-teal-600" : "text-white"}`} />
              <span>{mood.label}</span>
              <span className="text-xs text-white/60 hidden sm:inline">{mood.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
