"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FOOD_TYPES, LAYER_LABELS } from "@/data/foodTypes";
import * as Lucide from "lucide-react";
import { track } from "@/lib/track";

const LAYERS = ["region", "experience", "specialized", "distance"];

function hydrate(initial) {
  const state = {};
  LAYERS.forEach((layer) => {
    const row = initial?.[layer];
    if (row && typeof row === "object") {
      if (Array.isArray(row)) {
        state[layer] = { mode: row.length ? "custom" : "any", selected: new Set(row) };
      } else {
        const mode = row.mode === "custom" ? "custom" : "any";
        const selected = Array.isArray(row.selected) ? new Set(row.selected) : new Set();
        state[layer] = { mode, selected };
      }
    } else if (Array.isArray(row)) {
      state[layer] = { mode: row.length ? "custom" : "any", selected: new Set(row) };
    } else {
      state[layer] = { mode: "any", selected: new Set() };
    }
  });
  return state;
}

export default function FiltersGrid({ initial, onChange }) {
  const [local, setLocal] = useState(() => hydrate(initial));
  const syncingRef = useRef(false);
  const didMount = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const nextState = hydrate(initial);
    const nextSnapshot = snapshot(nextState);
    const currentSnapshot = snapshot(local);
    if (JSON.stringify(nextSnapshot) === JSON.stringify(currentSnapshot)) {
      return;
    }
    syncingRef.current = true;
    setLocal(nextState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const counts = useMemo(() => {
    const totals = {};
    LAYERS.forEach((layerKey) => {
      const totalCount = FOOD_TYPES[layerKey].length;
      const layer = local[layerKey];
      const size = layer.selected.size;
      const isAny = layer.mode !== "custom" || size === 0 || size === totalCount;
      totals[layerKey] = isAny ? "All" : `${size}/${totalCount}`;
    });
    return totals;
  }, [local]);

  // Emit upward after initial mount only
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onChangeRef.current?.(serialize(local));
  }, [local]);

  const setLayer = (layerKey, updater) => {
    setLocal((prev) => {
      const current = prev[layerKey];
      const updated = updater(current, layerKey);
      return { ...prev, [layerKey]: updated };
    });
  };

  const toggleDontCare = (layerKey) => {
    setLayer(layerKey, (state) => {
      const isCustom = state.mode === "custom";
      if (isCustom) {
        try { track("filter_any_selected", { layer: layerKey }); } catch {}
        return { mode: "any", selected: new Set() };
      }
      const allIds = FOOD_TYPES[layerKey].map((option) => option.id);
      try { track("filter_any_deselected", { layer: layerKey }); } catch {}
      return { mode: "custom", selected: new Set(allIds) };
    });
  };

  const handleToggle = (layerKey, id) => {
    setLayer(layerKey, (state) => {
      const nextSelected = state.mode === "custom" ? new Set(state.selected) : new Set();
      if (nextSelected.has(id)) {
        nextSelected.delete(id);
      } else {
        nextSelected.add(id);
      }
      const size = nextSelected.size;
      const total = FOOD_TYPES[layerKey].length;
      if (size === total) {
        try { track("layer_full_selection", { layer: layerKey }); } catch {}
        return { mode: "any", selected: new Set() };
      }
      return { mode: "custom", selected: nextSelected };
    });
  };

  const handleSelectAll = () => {
    setLocal(() => {
      const next = {};
      LAYERS.forEach((layer) => {
        const ids = FOOD_TYPES[layer].map((item) => item.id);
        next[layer] = { mode: "custom", selected: new Set(ids) };
      });
      return next;
    });
  };

  const handleClearAll = () => {
    const blank = {};
    LAYERS.forEach((layer) => {
      blank[layer] = { mode: "any", selected: new Set() };
    });
    setLocal(blank);
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

      {LAYERS.map((layerKey) => {
        const layer = local[layerKey];
        const isCustom = layer.mode === "custom";
        return (
          <section key={layerKey} className="rounded-2xl bg-white/10 backdrop-blur-sm shadow-lg p-4">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div>
                <h3 className="text-white/95 font-semibold">
                  {LAYER_LABELS[layerKey]} <span className="text-white/60 font-normal">({counts[layerKey]})</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => toggleDontCare(layerKey)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition border ${
                  !isCustom
                    ? "bg-white/80 text-slate-700 border-white/40 shadow"
                    : "bg-transparent text-white border-white/40 hover:bg-white/10"
                }`}
              >
                {!isCustom ? "Don’t Care Active" : "Set Don’t Care"}
              </button>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {FOOD_TYPES[layerKey].map((item) => {
                const Icon = Lucide[item.icon] || Lucide.HelpCircle;
                const active = layer.mode === "custom" && layer.selected.has(item.id);
                const disabled = layer.mode !== "custom";
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggle(layerKey, item.id)}
                    onMouseEnter={(e) => !disabled && onEnter(e, layerKey, item)}
                    onMouseLeave={onLeave}
                    className={`group relative flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      disabled
                        ? "border-white/10 bg-white/5 text-white/50 cursor-not-allowed"
                        : active
                          ? "border-white/50 bg-white/20 shadow-inner"
                          : "border-white/20 hover:border-white/40 bg-white/10 hover:bg-teal-100/50"
                    }`}
                  >
                    <span className="text-xl leading-none">
                      <Icon className="w-5 h-5 text-white" />
                    </span>
                    <span className="text-white/95 font-medium">{item.label}</span>
                    <span className={`ml-auto size-5 rounded border flex items-center justify-center ${
                      active ? "bg-emerald-400/90 border-emerald-300" : "border-white/40"
                    }`}>
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
            {isCustom && layer.selected.size === 0 ? (
              <p className="mt-3 text-xs text-amber-100">Select at least one option or toggle “Don’t Care”.</p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function serialize(state) {
  const payload = {};
  LAYERS.forEach((layerKey) => {
    const layer = state[layerKey];
    const selected = Array.from(layer.selected);
    const isAny = layer.mode !== "custom";
    payload[layerKey] = {
      mode: isAny ? "any" : "custom",
      selected: isAny ? [] : selected,
    };
  });
  return payload;
}

function snapshot(state) {
  const payload = {};
  LAYERS.forEach((layerKey) => {
    const layer = state[layerKey] || { mode: "any", selected: new Set() };
    const mode = layer.mode === "custom" ? "custom" : "any";
    const selected = layer.selected instanceof Set ? Array.from(layer.selected).sort() : [];
    payload[layerKey] = { mode, selected };
  });
  return payload;
}

