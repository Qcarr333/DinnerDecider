"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDinner } from "@/context/DinnerContext";
import { track } from "@/lib/track";

export default function SharePage() {
  const { user } = useDinner();
  const [copied, setCopied] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const base = typeof window !== "undefined" ? window.location.origin : "https://dinnerdecider.app";
  const link = `${base}/dinnerdecider${user?.code ? `?ref=${user.code}` : ""}`;
  const text = encodeURIComponent("I stopped arguing about dinner. Try DinnerDecider 🍽️ https://dinnerdecider.app");

  const share = (url) => {
    track("social_share_triggered", { dest: url });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setConfetti(Array.from({ length: 24 }).map((_, i) => ({ id: i, x: Math.random() * 100, d: 0.8 + Math.random() * 0.6 })));
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-teal-50 to-pink-50 px-4 pt-24 pb-12">
      <div className="w-full max-w-lg rounded-2xl bg-white/90 backdrop-blur shadow p-6 text-gray-800 relative overflow-hidden">
        <h1 className="text-2xl font-bold text-teal-700">Share DinnerDecider</h1>
        <p className="text-sm text-gray-600 mt-1">Help friends stop arguing and start eating.</p>
        <div className="mt-3 p-3 bg-gray-50 rounded border text-sm break-all">{link}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => share(`https://twitter.com/intent/tweet?text=${text}`)} className="rounded-lg bg-black text-white px-4 py-2">Twitter</button>
          <button onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`)} className="rounded-lg bg-blue-600 text-white px-4 py-2">Facebook</button>
          <button onClick={() => share(`https://www.reddit.com/submit?url=${encodeURIComponent(link)}&title=${text}`)} className="rounded-lg bg-orange-600 text-white px-4 py-2">Reddit</button>
          <button onClick={() => share(`https://api.whatsapp.com/send?text=${text}`)} className="rounded-lg bg-green-600 text-white px-4 py-2">WhatsApp</button>
          <button onClick={doCopy} className="rounded-lg bg-white border px-4 py-2 hover:bg-teal-50">Copy Link</button>
        </div>
        {confetti.map((c) => (
          <motion.span
            key={c.id}
            initial={{ opacity: 1, y: -10, x: `${c.x}%` }}
            animate={{ opacity: 0, y: 200 }}
            transition={{ duration: c.d }}
            className="absolute text-2xl select-none"
          >
            🎉
          </motion.span>
        ))}
        {copied && <div className="mt-2 text-sm text-emerald-700">Link copied!</div>}
      </div>
    </main>
  );
}

