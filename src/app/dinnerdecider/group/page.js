"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function GroupLanding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dd_group_current") || "null");
      if (saved?.name) setName(saved.name);
    } catch {}
  }, []);

  const go = useCallback((code) => {
    const payload = { name: name.trim() || "Guest", groupCode: code };
    try { localStorage.setItem("dd_group_current", JSON.stringify(payload)); } catch {}
    router.push(`/dinnerdecider/group/${code}`);
  }, [name, router]);

  const handleCreate = () => {
    go(randomCode());
  };

  const handleJoin = () => {
    const code = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length === 6) go(code);
  };

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-teal-100 to-pink-100 px-4 pt-24 pb-10">
      <div className="mx-auto max-w-xl bg-white/80 backdrop-blur rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-teal-700">Group Vote</h1>
        <p className="text-gray-600 mt-1">Create a room and share the code, or join one.</p>

        <div className="mt-6 grid gap-5">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              className="flex-1 rounded-lg bg-teal-600 text-white px-4 py-2 font-medium hover:bg-teal-700 shadow"
            >
              Create Group
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm text-gray-700 mb-1">Enter code to join</label>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                maxLength={6}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={handleJoin}
                className="rounded-lg bg-white px-4 py-2 border border-gray-300 hover:bg-teal-50"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

