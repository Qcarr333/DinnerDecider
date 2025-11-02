"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/track";

const DISMISS_KEY = "premiumBannerDismissed";

export default function ConversionBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const legacyDismissed = localStorage.getItem("dd_conv_banner_dismissed") === "1";
      const storedDismissed = localStorage.getItem(DISMISS_KEY) === "true";
      if (legacyDismissed && !storedDismissed) {
        localStorage.setItem(DISMISS_KEY, "true");
      }
      if (localStorage.getItem(DISMISS_KEY) === "true") {
        return;
      }
      const rawSessions = localStorage.getItem("dd_sessions");
      const sessions = rawSessions ? Number(rawSessions) : 0;
      const nextSessions = sessions + 1;
      localStorage.setItem("dd_sessions", String(nextSessions));
      if (nextSessions > 3) {
        setShow(true);
        try {
          track("conversion_banner_shown");
          track("conversion_banner_seen");
        } catch {}
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
      localStorage.setItem("dd_conv_banner_dismissed", "1");
    } catch {}
    try {
      track("conversion_banner_dismissed");
    } catch {}
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const raw = localStorage.getItem("dd_waitlist");
      const entries = raw ? JSON.parse(raw) : [];
      if (!entries.includes(trimmed)) {
        entries.push(trimmed);
        localStorage.setItem("dd_waitlist", JSON.stringify(entries));
      }
      track("waitlist_signup");
      setEmail("");
      handleDismiss();
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
          className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-xl -translate-x-1/2 rounded-2xl border bg-white p-4 shadow-xl"
        >
          <div className="relative flex flex-col items-center gap-3 md:flex-row">
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss premium offer"
              className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <div className="flex-1 pr-6">
              <div className="font-semibold text-gray-900">
                🎁 Get Premium Free for a Month — Refer 3 Friends Today!
              </div>
              <div className="text-sm text-gray-600">
                Join the waitlist and we’ll notify you when referrals open.
              </div>
            </div>
            <form onSubmit={onSubmit} className="flex w-full gap-2 md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 md:flex-none"
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
              >
                Join
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50"
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
