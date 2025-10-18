import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[100svh] grid place-items-center p-8">
      <div className="text-center text-white">
        <h1 className="text-3xl font-bold mb-3">DinnerDecider</h1>
        <p className="opacity-90 mb-6">Fast, fun restaurant picking.</p>
        <Link href="/dinnerdecider" className="px-5 py-3 rounded-full bg-white text-teal-700 font-semibold">Open Dashboard</Link>
      </div>
    </main>
  );
}