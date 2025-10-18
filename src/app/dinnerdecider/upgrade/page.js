"use client";

import { useEffect, useState } from "react";
import { useDinner } from "@/context/DinnerContext";
import { hasStripe, startCheckoutMock, startRealCheckout } from "@/lib/payments";
import { track } from "@/lib/track";
import { motion } from "framer-motion";

export default function UpgradePage() {
  const { user, setUser } = useDinner();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [promo, setPromo] = useState(() => {
    try { return localStorage.getItem("dd_promo_pending") || ""; } catch { return ""; }
  });
  const [toast, setToast] = useState("");

  useEffect(() => { console.log("💎 Upgrade route working"); }, []);

  async function handlePlan(plan) {
    setBusy(true); setError("");
    const useReal = hasStripe();
    const res = await (useReal ? startRealCheckout(plan, promo) : startCheckoutMock(plan, promo));
    setBusy(false);
    if (res.ok) {
      try {
        const next = { ...(user || { name: "Guest", premium: false }), premium: true };
        localStorage.setItem("dd_user", JSON.stringify(next));
        setUser(next);
      } catch {}
      track("payment_successful", { plan, promo });
      console.log("✅ Mock payment successful");
      setToast("✅ Upgrade successful — enjoy Premium features!");
      setTimeout(()=>setToast(""), 2500);
    } else {
      track("payment_failed", { plan, promo });
      setError(res.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-amber-50 to-teal-50 px-4 pt-24 pb-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-teal-700">Upgrade to Premium 💎</h1>
        <p className="text-gray-600 mt-1">Unlock unlimited rerolls, Smart Suggest, and Auto Pick.</p>
        <div className="mt-4">
          <label className="text-sm text-gray-700 mr-2">Promo code</label>
          <input value={promo} onChange={(e)=>setPromo(e.target.value.toUpperCase())} placeholder="FRIEND5" className="rounded border px-2 py-1" />
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <PlanCard title="Free" price="$0" features={["✅ 3 R1 rerolls", "✅ 6 R2 rerolls", "✅ Group voting"]} cta="Current" disabled />
          <motion.div initial={{ boxShadow: "0 0 0px rgba(20,184,166,0.6)" }} animate={{ boxShadow: ["0 0 0px rgba(20,184,166,0.6)", "0 0 16px rgba(20,184,166,0.6)", "0 0 0px rgba(20,184,166,0.6)"] }} transition={{ repeat: Infinity, duration: 2 }} className="rounded-2xl">
            <PlanCard highlight title="Premium" price="$4.99 / month" features={["✅ Unlimited rerolls", "✅ Smart Suggest", "✅ Auto Pick Tonight", "✅ No ads"]} cta={busy?"Processing…":"Choose Premium"} onClick={()=>handlePlan("premium_monthly")} />
          </motion.div>
          <PlanCard title="Lifetime" price="$29 one-time" features={["✅ All Premium features", "✅ Lifetime updates", "✅ No ads"]} cta={busy?"Processing…":"Go Lifetime"} onClick={()=>handlePlan("premium_lifetime")} />
        </div>
        {error ? <div className="mt-4 rounded bg-rose-50 border border-rose-200 text-rose-700 p-3">{error}</div> : null}
        {toast ? <div className="mt-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 p-3">{toast}</div> : null}
      </div>
    </main>
  );
}

function PlanCard({ title, price, features, cta, onClick, disabled, highlight }) {
  return (
    <div className={`rounded-2xl bg-white shadow p-5 flex flex-col ${highlight ? "ring-2 ring-teal-400" : ""}`}>
      <div className="text-lg font-semibold text-gray-900">{title}</div>
      <div className="text-2xl font-bold text-teal-700 mt-1">{price}</div>
      <ul className="mt-3 text-sm text-gray-700 space-y-1">
        {features.map((f) => <li key={f}>• {f}</li>)}
      </ul>
      <button disabled={disabled} onClick={onClick} className="mt-auto rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-500">
        {cta}
      </button>
    </div>
  );
}
