"use client";

import { useEffect } from "react";
import { useDinner } from "@/context/DinnerContext";
import { track } from "@/lib/track";
import { applyPromoFromQuery } from "@/lib/referrals";

function ensureUserCode(user, setUser) {
  if (!user) return null;
  if (user.code) return user.code;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  const next = { ...user, code: out };
  setUser(next);
  return out;
}

export default function ReferPage() {
  const { user, setUser } = useDinner();
  const code = ensureUserCode(user, setUser);
  const link = typeof window !== "undefined" ? `${window.location.origin}/dinnerdecider/refer?code=${code || ""}` : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const extCode = params.get("code");
    if (extCode && (!user || user.code !== extCode)) {
      try { localStorage.setItem("dd_referral_pending", extCode); } catch {}
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const p = applyPromoFromQuery(params);
    if (p) {
      track("promo_applied", { promo: p });
      console.log("🎁 Promo code detected → applied");
      alert(`Promo code ${p} applied successfully.`);
    }
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); alert("Link copied!"); } catch { alert(link); }
  };
  const inviteSMS = () => { const body = encodeURIComponent(`Join DinnerDecider with me! ${link}`); window.location.href = `sms:?body=${body}`; };
  const inviteWhatsApp = () => { const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join DinnerDecider with me! ${link}`)}`; window.open(url, "_blank", "noopener,noreferrer"); };

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-teal-50 to-pink-50 px-4 pt-24 pb-12 grid place-items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white/90 backdrop-blur shadow p-6 text-gray-800">
        <h1 className="text-2xl font-bold text-teal-700">Invite Friends, Earn Rewards</h1>
        <p className="text-sm text-gray-600 mt-1">Share your link. Earn 1 month Premium for every 3 referrals.</p>
        <div className="mt-3 p-3 bg-gray-50 rounded border text-sm break-all">{link || "Generating..."}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => { track("referral_shared"); copy(); }} className="bg-teal-500 text-white rounded-lg px-4 py-2 hover:bg-teal-600">🔗 Copy Link</button>
          <button onClick={() => { track("referral_shared"); inviteSMS(); }} className="bg-teal-500 text-white rounded-lg px-4 py-2 hover:bg-teal-600">📱 Invite via SMS</button>
          <button onClick={() => { track("referral_shared"); inviteWhatsApp(); }} className="bg-teal-500 text-white rounded-lg px-4 py-2 hover:bg-teal-600">💬 WhatsApp</button>
        </div>
      </div>
    </main>
  );
}

