"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getFlags } from "@/lib/launchFlags";
import { track } from "@/lib/track";

function useCountdown(ts) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t); }, []);
  const diff = Math.max(0, (new Date(ts).getTime() || 0) - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000)/3600000);
  const m = Math.floor((diff % 3600000)/60000);
  const s = Math.floor((diff % 60000)/1000);
  return { d, h, m, s };
}

export default function LandingPage() {
  const flags = getFlags();
  const [email, setEmail] = useState("");
  const { d, h, m, s } = useCountdown(flags.launchDate);

  const onWaitlist = (e) => {
    e.preventDefault(); const v = email.trim(); if (!v) return;
    try { const raw = localStorage.getItem("dd_waitlist"); const arr = raw?JSON.parse(raw):[]; if(!arr.includes(v)) arr.push(v); localStorage.setItem("dd_waitlist", JSON.stringify(arr)); setEmail(""); } catch {}
  };

  const onChannelClick = (c) => { track("launch_channel_click", { c }); };

  useEffect(() => { track("landing_view"); }, []);

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-white to-teal-50">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <title>DinnerDecider – Stop Arguing, Start Eating</title>
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900">Stop Arguing About Dinner. Start Deciding.</h1>
          <p className="mt-3 text-gray-600">Two fun spins: choose your vibe, then pick your spot. Filters, AI, group voting and premium auto-pick.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/dinnerdecider" className="rounded-full bg-teal-600 text-white px-6 py-3 font-medium hover:bg-teal-700">Try Free Now</Link>
            <Link href="/press-kit" className="rounded-full bg-white border px-6 py-3 font-medium hover:bg-teal-50">Press Kit</Link>
          </div>
          {flags.launchDate ? (
            <div className="mt-6 text-sm text-gray-700">Launch in: {d}d {h}h {m}m {s}s</div>
          ) : null}
        </div>

        <div className="mt-12 grid md:grid-cols-4 gap-4">
          {["Filters","AI Recommender","Group Vote","Premium Auto Pick"].map((t,i)=> (
            <div key={t} className="rounded-2xl bg-white shadow p-5">
              <div className="text-lg font-semibold text-gray-900">{t}</div>
              <p className="text-sm text-gray-600 mt-1">{["Smart layers", "Learns your taste", "Decide together", "Skip to the good part"][i]}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="rounded-full bg-rose-500 text-white px-8 py-3 font-semibold shadow hover:bg-rose-600" onClick={()=>location.href='/dinnerdecider'}>
            Let’s Eat!
          </motion.button>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {["“We picked a place in 30 seconds!”","“Auto Pick saved our date night.”","“No more fights about food.”"].map((q,i)=> (
            <div key={i} className="rounded-2xl bg-white shadow p-5">
              <p className="italic text-gray-800">{q}</p>
              <p className="mt-2 text-sm text-gray-500">— Beta user #{i+1}</p>
            </div>
          ))}
        </div>

        <form onSubmit={onWaitlist} className="mt-12 max-w-md mx-auto flex gap-2">
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 rounded-lg border px-3 py-2" />
          <button className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700">Join Waitlist</button>
        </form>

        {flags.launchChannels?.length ? (
          <div className="mt-6 text-center text-sm text-gray-600">Follow our launch: {flags.launchChannels.map((c,idx)=>(<button key={c} onClick={()=>onChannelClick(c)} className="underline mx-1">{c}{idx<flags.launchChannels.length-1?',':''}</button>))}</div>
        ) : null}
      </div>
    </main>
  );
}

