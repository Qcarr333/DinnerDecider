"use client";

import { useEffect, useMemo, useState } from "react";
import { getLocalEvents, aggregateDaily, funnelCounts } from "@/lib/analyticsDashboard";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function AnalyticsAdmin() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    setEvents(getLocalEvents());
  }, []);

  const daily = useMemo(() => aggregateDaily(events), [events]);
  const funnel = useMemo(() => funnelCounts(events), [events]);

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-slate-50 to-emerald-50 px-4 pt-24 pb-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <h1 className="text-2xl font-bold text-teal-700">Analytics Dashboard</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-white shadow p-4">
            <h2 className="font-semibold mb-3">Daily Active (Let’s Eat)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl bg-white shadow p-4">
            <h2 className="font-semibold mb-3">Rerolls per Day</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="rerolls" stroke="#0ea5e9" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl bg-white shadow p-4">
          <h2 className="font-semibold mb-3">Funnel (Local)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            {[
              { label: "Landing", v: funnel.landing },
              { label: "Let’s Eat", v: funnel.letsEat },
              { label: "Output", v: funnel.output },
              { label: "Feedback", v: funnel.feedback },
              { label: "Refer", v: funnel.refer },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-slate-50 border p-3">
                <div className="text-xs text-slate-500">{x.label}</div>
                <div className="text-xl font-semibold">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Note: Vercel Analytics aggregation can be added via server-side API if tokens are provided; this dashboard currently visualizes client-side tracked events.</p>
      </div>
    </main>
  );
}

