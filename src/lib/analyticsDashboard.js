export function getLocalEvents() {
  try {
    const raw = localStorage.getItem("dd_events");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function aggregateDaily(events) {
  const day = (ts) => new Date(ts).toISOString().slice(0, 10);
  const days = {};
  for (const e of events) {
    const d = day(e.t || Date.now());
    days[d] ||= { date: d, users: 0, rerolls: 0, saves: 0, aiPicks: 0, referrals: 0 };
    if (e.n === "reroll_clicked") days[d].rerolls++;
    if (e.n === "ai_auto_pick_triggered") days[d].aiPicks++;
    if (e.n === "referral_converted") days[d].referrals++;
    if (e.n === "save_clicked") days[d].saves++;
    if (e.n === "lets_eat_clicked") days[d].users++;
  }
  return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
}

export function funnelCounts(events) {
  const counts = { landing: 0, letsEat: 0, output: 0, feedback: 0, refer: 0 };
  for (const e of events) {
    if (e.n === "landing_view") counts.landing++;
    if (e.n === "lets_eat_clicked") counts.letsEat++;
    if (e.n === "output_view") counts.output++;
    if (e.n === "ai_suggested_combo_accepted" || e.n === "ai_suggested_combo_rejected") counts.feedback++;
    if (e.n === "referral_shared") counts.refer++;
  }
  return counts;
}

