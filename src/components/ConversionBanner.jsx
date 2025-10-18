"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/track";

export default function ConversionBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dd_sessions");
      const n = raw ? Number(raw) : 0;
      const next = n + 1;
      localStorage.setItem("dd_sessions", String(next));
      const dismissed = localStorage.getItem("dd_conv_banner_dismissed") === "1";
      if (next > 3 && !dismissed) {
        setShow(true);
        track("conversion_banner_shown");
        track("conversion_banner_seen");
      }
    } catch {}
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const raw = localStorage.getItem("dd_waitlist");
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.includes(trimmed)) arr.push(trimmed);
      localStorage.setItem("dd_waitlist", JSON.stringify(arr));
      track("waitlist_signup");
      setEmail("");
      setShow(false);
    } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl rounded-2xl bg-white shadow-xl border p-4 z-50"
        >
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">🎁 Get Premium Free for a Month — Refer 3 Friends Today!</div>
              <div className="text-sm text-gray-600">Join the waitlist and we’ll notify you when referrals open.</div>
            </div>
            <form onSubmit={onSubmit} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 md:flex-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
              <button type="submit" className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700">Join</button>
              <button
                type="button"
                onClick={() => {
                  setShow(false);
                  try { localStorage.setItem("dd_conv_banner_dismissed", "1"); } catch {}
                  track("conversion_banner_dismissed");
                }}
                className="rounded-lg bg-white border px-3 py-2 hover:bg-gray-50"
              >
                Close
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
