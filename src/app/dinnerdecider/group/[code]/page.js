"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDinner } from "@/context/DinnerContext";
import { track } from "@/lib/track";
import Image from "next/image";

function getSessionKey(code) {
  return `dd_group_${code}`;
}

function loadSession(code, restaurants) {
  try {
    const raw = localStorage.getItem(getSessionKey(code));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    groupCode: code,
    participants: [],
    votes: {},
    restaurants: restaurants || [],
  };
}

function saveSession(code, session) {
  try { localStorage.setItem(getSessionKey(code), JSON.stringify(session)); } catch {}
}

export default function GroupSessionPage() {
  const { code } = useParams();
  const { restaurants } = useDinner();
  const [session, setSession] = useState(() => loadSession(code, restaurants));
  const [page, setPage] = useState(0); // index of the 3-card page
  const [winner, setWinner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);

  useEffect(() => {
    // If restaurants were empty at first mount but later load, hydrate session
    if ((session?.restaurants?.length ?? 0) === 0 && restaurants?.length) {
      const next = { ...session, restaurants };
      setSession(next);
      saveSession(code, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants]);

  const currentSlice = useMemo(() => {
    const start = page * 3;
    return session.restaurants.slice(start, start + 3);
  }, [session.restaurants, page]);

  const handleVote = useCallback((name, delta) => {
    setSession((prev) => {
      const votes = { ...(prev.votes || {}) };
      votes[name] = (votes[name] || 0) + delta;
      const next = { ...prev, votes };
      saveSession(code, next);
      return next;
    });
  }, [code]);

  const handleFinalize = useCallback(() => {
    try { track("group_finalize"); } catch {}
    const entries = Object.entries(session.votes || {});
    if (entries.length === 0) {
      setWinner(null);
      return;
    }
    // pick highest score; tie-break by rating; then by order in list
    let best = null;
    for (const [name, score] of entries) {
      const rest = session.restaurants.find((r) => r.name === name);
      const rating = rest?.rating ?? 0;
      if (!best) {
        best = { name, score, rating, item: rest };
      } else {
        const cmp = score - best.score || rating - best.rating || 0;
        if (cmp > 0) best = { name, score, rating, item: rest };
      }
    }
    setWinner(best?.item || null);
  }, [session]);

  // Countdown timer logic (90s default)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !winner) {
      handleFinalize();
    }
  }, [timeLeft, winner, handleFinalize]);

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    } catch {
      alert(window.location.href);
    }
  }, []);

  const handleInviteSMS = useCallback(() => {
    const body = encodeURIComponent(`Join our DinnerDecider group! Use this link: ${window.location.href}`);
    window.location.href = `sms:?body=${body}`;
  }, []);

  const handleInviteWhatsApp = useCallback(() => {
    const link = encodeURIComponent(window.location.href);
    const url = `https://api.whatsapp.com/send?text=Join%20our%20DinnerDecider%20group!%20${link}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-teal-50 to-pink-50 px-4 pt-24 pb-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <div className="text-teal-700 font-semibold">Group Code: <span className="font-mono tracking-widest">{code}</span></div>
          <button
            className="rounded-lg bg-white px-3 py-1.5 border border-gray-300 hover:bg-teal-50"
            onClick={handleCopy}
          >
            Copy Link
          </button>
        </div>

        {/* Invite Friends section */}
        <div className="mb-4">
          <button
            onClick={handleInviteSMS}
            className="bg-teal-500 text-white rounded-lg px-4 py-2 m-1 hover:bg-teal-600 transition-all"
          >
            📱 Invite via SMS
          </button>
          <button
            onClick={handleInviteWhatsApp}
            className="bg-teal-500 text-white rounded-lg px-4 py-2 m-1 hover:bg-teal-600 transition-all"
          >
            💬 Invite via WhatsApp
          </button>
          <button
            onClick={handleCopy}
            className="bg-teal-500 text-white rounded-lg px-4 py-2 m-1 hover:bg-teal-600 transition-all"
          >
            🔗 Copy Link
          </button>
        </div>

        {winner ? (
          <div className="rounded-2xl bg-white shadow p-5">
            <h2 className="text-xl font-bold text-teal-700 mb-2">Winner 🎉</h2>
            <div className="grid gap-2">
              <div className="font-semibold">{winner.name}</div>
              <div className="text-yellow-600">⭐ {winner.rating}</div>
              <Image
                src={winner.photo || "/placeholder.jpg"}
                alt={winner.name}
                width={640}
                height={264}
                className="w-full h-44 object-cover rounded-xl"
                unoptimized
                priority
              />
              <div className="text-gray-700">{winner.address}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              {currentSlice.map((r) => (
                <div key={r.name} className="rounded-xl bg-white shadow p-4 flex flex-col">
                  <Image
                    src={r.photo || "/placeholder.jpg"}
                    alt={r.name}
                    width={480}
                    height={192}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                    unoptimized
                  />
                  <div className="font-semibold text-gray-900">{r.name}</div>
                  <div className="text-sm text-yellow-600">⭐ {r.rating}</div>
                  <div className="text-sm text-gray-600 line-clamp-2 mt-1">{r.address}</div>
                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <button
                      onClick={() => handleVote(r.name, +1)}
                      className="flex-1 rounded-lg bg-emerald-100 text-gray-800 px-3 py-2 hover:bg-emerald-200"
                    >
                      👍 Like
                    </button>
                    <button
                      onClick={() => handleVote(r.name, -1)}
                      className="flex-1 rounded-lg bg-rose-100 text-gray-800 px-3 py-2 hover:bg-rose-200"
                    >
                      👎 Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm text-gray-600">Voting updates are saved locally for this code.</div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg bg-white px-3 py-2 border border-gray-300 hover:bg-teal-50"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="rounded-lg bg-white px-3 py-2 border border-gray-300 hover:bg-teal-50"
                  onClick={() => setPage((p) => (p + 1) * 3 < (session.restaurants?.length || 0) ? p + 1 : p)}
                >
                  Next
                </button>
                <button
                  className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700"
                  onClick={handleFinalize}
                >
                  Finalize Votes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Top-right countdown timer */}
      <div className="fixed top-2 right-2 bg-white/80 backdrop-blur rounded-full px-3 py-1 shadow text-sm">
        ⏱ {formatTime(timeLeft)} remaining
      </div>
    </main>
  );
}
