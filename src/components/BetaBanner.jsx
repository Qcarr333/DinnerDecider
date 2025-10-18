"use client";

import { useEffect, useState } from "react";
import { getFlags } from "@/lib/launchFlags";
import { track } from "@/lib/track";

export default function BetaBanner() {
  const { beta } = getFlags();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!beta) return;
    try {
      const dismissed = localStorage.getItem("dd_beta_banner_dismissed");
      if (dismissed === "1") return; // respect prior dismissal
    } catch {}
    setShown(true);
    track("beta_mode_enabled");
    track("launch_banner_seen");
  }, [beta]);
  if (!shown) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-40 text-center">
      <div className="relative mx-auto max-w-4xl rounded-b-xl bg-amber-100 text-amber-900 py-2 shadow">
        <span>🚧 Beta Mode: Some features are mocked.</span>
        <button
          aria-label="Dismiss beta banner"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-amber-900 hover:bg-amber-200"
          onClick={() => {
            setShown(false);
            try { localStorage.setItem("dd_beta_banner_dismissed", "1"); } catch {}
            track("launch_banner_dismissed");
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

