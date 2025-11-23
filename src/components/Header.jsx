"use client";

import Link from "next/link";
import { useDinner } from "@/context/DinnerContext";

export default function Header() {
  const { user, planAhead, authUser, signOut } = useDinner();
  const planAheadActive = Boolean(planAhead?.enabled && planAhead?.location);
  return (
    <header className="flex justify-between items-center p-4 bg-white/70 backdrop-blur rounded-b-xl shadow-sm fixed top-0 left-0 right-0 z-10">
      <Link href="/dinnerdecider" className="font-bold text-teal-600 hover:text-teal-700 transition">
        DinnerDecider {user?.premium ? <span className="ml-2 align-middle">💎</span> : null}
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/dinnerdecider/plan"
          className={`px-3 py-1.5 rounded-lg transition transform hover:scale-[1.02] ${
            planAheadActive
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "bg-white text-gray-800 hover:bg-teal-100"
          }`}
        >
          Plan Ahead {planAheadActive ? <span className="ml-1 text-xs">●</span> : null}
        </Link>
        <Link
          href={authUser ? "/dinnerdecider/profile" : "/dinnerdecider/login"}
          className="px-3 py-1.5 rounded-lg bg-white transition transform hover:bg-teal-100 hover:scale-[1.02] text-gray-800"
        >
          {authUser ? "Profile" : "Sign In"}
        </Link>
        {authUser ? (
          <button
            type="button"
            onClick={async () => {
              if (signOut) {
                await signOut();
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-teal-200 bg-white/60 text-gray-700 transition hover:bg-teal-100 hover:scale-[1.02]"
          >
            Sign Out
          </button>
        ) : null}
      </nav>
    </header>
  );
}
