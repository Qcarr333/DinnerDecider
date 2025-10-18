"use client";

import Link from "next/link";
import { useDinner } from "@/context/DinnerContext";

export default function Header() {
  const { user } = useDinner();
  return (
    <header className="flex justify-between items-center p-4 bg-white/70 backdrop-blur rounded-b-xl shadow-sm fixed top-0 left-0 right-0 z-10">
      <Link href="/dinnerdecider" className="font-bold text-teal-600 hover:text-teal-700 transition">
        DinnerDecider {user?.premium ? <span className="ml-2 align-middle">💎</span> : null}
      </Link>
      <Link
        href="/dinnerdecider/profile"
        className="px-3 py-1.5 rounded-lg bg-white transition transform hover:bg-teal-100 hover:scale-[1.02] text-gray-800"
      >
        Profile
      </Link>
    </header>
  );
}
