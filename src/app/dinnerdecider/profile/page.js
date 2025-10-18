"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDinner } from "@/context/DinnerContext";
import { FOOD_TYPES } from "@/data/foodTypes";
import { track } from "@/lib/track";

export default function ProfilePage() {
  const { savedRestaurants, user, setUser } = useDinner();
  const [name, setName] = useState("");
  const savedRef = useRef(null);

  useEffect(() => { console.log("🧹 Profile cleanup done"); }, []);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = ""; for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const u = { name: trimmed, premium: false, referrals: 0, code };
    try { localStorage.setItem("dd_user", JSON.stringify(u)); } catch {}
    setUser(u);
    try {
      const ref = localStorage.getItem("dd_referral_pending");
      if (ref) {
        const raw = localStorage.getItem("dd_referral_counts");
        const obj = raw ? JSON.parse(raw) : {};
        obj[ref] = (obj[ref] || 0) + 1;
        localStorage.setItem("dd_referral_counts", JSON.stringify(obj));
        localStorage.removeItem("dd_referral_pending");
        track("referral_converted");
      }
    } catch {}
  };

  const handleLogout = () => {
    try { localStorage.removeItem("dd_user"); } catch {}
    window.location.reload();
  };

  const referrals = (() => { try { const counts = JSON.parse(localStorage.getItem("dd_referral_counts") || "{}"); return user ? (counts[user.code] || 0) : 0; } catch { return 0; } })();
  const promo = (() => { try { return localStorage.getItem("dd_promo_pending"); } catch { return null; } })();

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-teal-50 to-pink-50 px-4 pt-24 pb-12">
      <div className="mx-auto max-w-2xl">
        {!user ? (
          <div className="rounded-2xl bg-white/90 backdrop-blur shadow p-6">
            <h1 className="text-2xl font-bold text-teal-700">Sign In / Register</h1>
            <p className="text-gray-600 mt-1">Create a local profile to save your favorites.</p>
            <div className="mt-4">
              <label className="block text-sm text-gray-700 mb-1">Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div className="mt-4">
              <button onClick={handleContinue} className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700">Continue</button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/90 backdrop-blur shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-teal-700">Hi, {user.name} 👋</h1>
                <div className="text-sm mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{user.premium ? "Premium" : "Free"} Tier</span>
                </div>
              </div>
              <button onClick={handleLogout} className="rounded-lg bg-white px-3 py-1.5 border border-gray-300 hover:bg-rose-50">Logout</button>
            </div>

            {promo ? (
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2">
                🎁 Promo code {promo} applied — 1 month free Premium!
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2 items-center">
              <button onClick={() => savedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="rounded-lg bg-white px-4 py-2 border border-gray-300 hover:bg-teal-50">Saved Restaurants</button>
              <Link href="/dinnerdecider/refer" className="rounded-lg bg-white px-4 py-2 border border-gray-300 hover:bg-teal-50">Refer Friends</Link>
              {!user.premium && (
                <Link href="/dinnerdecider/upgrade" className="bg-teal-500 text-white rounded-lg px-4 py-2 hover:bg-teal-600 transition">Upgrade to Premium 💎</Link>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-700">Referrals: {referrals}</div>

            <div className="mt-4 rounded-xl bg-white/80 backdrop-blur p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Your AI Insights</h3>
              <ul className="text-sm text-gray-700 list-disc pl-5">
                <li>
                  Most common liked Region: {(() => { try {
                    const w = JSON.parse(localStorage.getItem("dd_feedback_weights") || "{\"region\":{},\"specialized\":{}}" );
                    const entries = Object.entries(w.region || {});
                    if (!entries.length) return "—";
                    const topId = entries.sort((a,b)=>b[1]-a[1])[0][0];
                    const map = new Map(FOOD_TYPES.region.map(x=>[x.id,x.label]));
                    return map.get(topId) || topId;
                  } catch { return "—"; } })()}
                </li>
                <li>
                  Top 3 liked Specialties: {(() => { try {
                    const w = JSON.parse(localStorage.getItem("dd_feedback_weights") || "{\"region\":{},\"specialized\":{}}" );
                    const entries = Object.entries(w.specialized || {});
                    if (!entries.length) return "—";
                    const map = new Map(FOOD_TYPES.specialized.map(x=>[x.id,x.label]));
                    return entries.sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id])=>map.get(id) || id).join(", ");
                  } catch { return "—"; } })()}
                </li>
                <li>
                  Time of day you usually decide: {(() => { try {
                    const times = JSON.parse(localStorage.getItem("dd_decision_times") || "[]");
                    if (!times.length) return "—";
                    const buckets = { morning:0, afternoon:0, evening:0, late:0 };
                    times.forEach((t)=>{ const h=new Date(t).getHours(); if(h<11)buckets.morning++; else if(h<16)buckets.afternoon++; else if(h<22)buckets.evening++; else buckets.late++; });
                    return Object.entries(buckets).sort((a,b)=>b[1]-a[1])[0][0];
                  } catch { return "—"; } })()}
                </li>
              </ul>
            </div>
          </div>
        )}

        <section ref={savedRef} className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Saved Restaurants</h2>
          {(!savedRestaurants || savedRestaurants.length === 0) ? (
            <div className="rounded-xl bg-white/80 backdrop-blur p-4 text-gray-600">No saved restaurants yet.</div>
          ) : (
            <div className="grid gap-3">
              {savedRestaurants.map((r, idx) => (
                <div key={`${r.name}-${idx}`} className="rounded-xl bg-white shadow p-4 flex items-start gap-3">
                  <img src={r.photo} alt={r.name} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{r.name}</div>
                    <div className="text-sm text-yellow-700">⭐ {r.rating}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{r.address}</div>
                  </div>
                  <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">View</a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

