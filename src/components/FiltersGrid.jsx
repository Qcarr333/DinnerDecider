"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FOOD_TYPES, LAYER_LABELS } from "@/data/foodTypes";
import * as Lucide from "lucide-react";
import { track } from "@/lib/track";

export default function FiltersGrid({ initial, onChange }) {
  const [local, setLocal] = useState(() => ({
    region: new Set(initial?.region || []),
    experience: new Set(initial?.experience || []),
    specialized: new Set(initial?.specialized || []),
    distance: new Set(initial?.distance || []),
  }));

  const counts = useMemo(
    () => ({
      region: local.region.size,
      experience: local.experience.size,
      specialized: local.specialized.size,
      distance: local.distance.size,
    }),
    [local]
  );

  // On mount, if nothing selected, select all (post-commit)
  useEffect(() => {
    const noneSelected =
      local.region.size === 0 &&
      local.experience.size === 0 &&
      local.specialized.size === 0 &&
      local.distance.size === 0;
    if (noneSelected) {
      setLocal({
        region: new Set(FOOD_TYPES.region.map((x) => x.id)),
        experience: new Set(FOOD_TYPES.experience.map((x) => x.id)),
        specialized: new Set(FOOD_TYPES.specialized.map((x) => x.id)),
        distance: new Set(FOOD_TYPES.distance.map((x) => x.id)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emit upward after initial mount only
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onChange?.(serialize(local));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleToggle = (layer, id) => {
    setLocal((prev) => {
      const next = new Set(prev[layer]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [layer]: next };
    });
  };

  const handleSelectAll = () => {
    setLocal({
      region: new Set(FOOD_TYPES.region.map((x) => x.id)),
      experience: new Set(FOOD_TYPES.experience.map((x) => x.id)),
      specialized: new Set(FOOD_TYPES.specialized.map((x) => x.id)),
      distance: new Set(FOOD_TYPES.distance.map((x) => x.id)),
    });
  };

  const handleClearAll = () => {
    setLocal({
      region: new Set(),
      experience: new Set(),
      specialized: new Set(),
      distance: new Set(),
    });
  };

  // Tooltip logic
  const [tooltip, setTooltip] = useState(null);
  const hoverTimer = useRef(null);
  const onEnter = (e, layer, item) => {
    clearTimeout(hoverTimer.current);
    const { clientX, clientY } = e;
    hoverTimer.current = setTimeout(() => {
      setTooltip({ id: item.id, layer, x: clientX, y: clientY, text: item.notes });
      try { track("filter_hover_tooltip_shown", { layer, id: item.id }); } catch {}
    }, 1200);
  };
  const onLeave = () => {
    clearTimeout(hoverTimer.current);
    setTooltip(null);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/90">Make your picks</div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full bg-white/15 hover:bg-white/25 px-4 py-1.5 text-white text-sm"
            onClick={handleSelectAll}
          >
            Select All
          </button>
          <button
            type="button"
            className="rounded-full bg-white/10 hover:bg-white/20 px-4 py-1.5 text-white text-sm"
            onClick={handleClearAll}
          >
            Deselect All
          </button>
        </div>
      </div>

      {["region", "experience", "specialized", "distance"].map((layerKey) => (
        <section key={layerKey} className="rounded-2xl bg-white/10 backdrop-blur-sm shadow-lg p-4">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-white/95 font-semibold">
              {LAYER_LABELS[layerKey]} <span className="text-white/60 font-normal">({counts[layerKey]})</span>
            </h3>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {FOOD_TYPES[layerKey].map((item) => {
              const active = local[layerKey].has(item.id);
              const Icon = Lucide[item.icon] || Lucide.HelpCircle;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggle(layerKey, item.id)}
                  onMouseEnter={(e) => onEnter(e, layerKey, item)}
                  onMouseLeave={onLeave}
                  className={[
                    "group relative flex items-center gap-3 rounded-xl border px-3 py-3 text-left",
                    active
                      ? "border-white/50 bg-white/20 shadow-inner"
                      : "border-white/20 hover:border-white/40 bg-white/10 hover:bg-teal-100/50",
                    "transition"
                  ].join(" ")}
                >
                  <span className="text-xl leading-none">
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <span className="text-white/95 font-medium">{item.label}</span>
                  <span className={[
                    "ml-auto size-5 rounded border flex items-center justify-center",
                    active ? "bg-emerald-400/90 border-emerald-300" : "border-white/40"
                  ].join(" ")}>
                    {active ? (
                      <span className="text-[10px] text-emerald-950 font-bold">✓</span>
                    ) : null}
                  </span>
                  {tooltip && tooltip.id === item.id && tooltip.layer === layerKey ? (
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full bg-white/90 text-gray-700 text-xs rounded px-2 py-1 shadow-md z-10">
                      {item.notes}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function serialize(state) {
  return {
    region: Array.from(state.region),
    experience: Array.from(state.experience),
    specialized: Array.from(state.specialized),
    distance: Array.from(state.distance),
  };
}

