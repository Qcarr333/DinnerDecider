"use client";

import { useState } from "react";

export default function LaunchPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch("https://api.buttondown.email/v1/subscribers", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.NEXT_PUBLIC_BUTTONDOWN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.status === 201) {
        setStatus("Thanks! You’re on the list.");
        setEmail("");
      } else {
        throw new Error(`Buttondown responded ${res.status}`);
      }
    } catch (err) {
      try {
        const raw = localStorage.getItem("dd_subscribers");
        const arr = raw ? JSON.parse(raw) : [];
        const updated = Array.from(new Set([...arr, trimmed]));
        localStorage.setItem("dd_subscribers", JSON.stringify(updated));
      } catch {}
      setStatus("Saved locally. We’ll notify you at launch!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-teal-50 to-pink-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur shadow p-6">
        <h1 className="text-2xl font-bold text-teal-700">DinnerDecider Launch</h1>
        <p className="text-gray-600 mt-1">Join the early access list.</p>
        <div className="mt-4 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Notify Me"}
          </button>
        </div>
        {status ? <div className="mt-3 text-sm text-gray-700">{status}</div> : null}
      </form>
    </main>
  );
}

