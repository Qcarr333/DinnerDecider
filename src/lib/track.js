export function track(name, props = {}) {
  if (typeof window !== "undefined") {
    try {
      // forward to Vercel Analytics
      if (window.va && typeof window.va.track === "function") window.va.track(name, props);
    } catch {}
    try {
      // persist locally for dashboard
      const raw = localStorage.getItem("dd_events");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ n: name, p: props, t: Date.now() });
      localStorage.setItem("dd_events", JSON.stringify(arr.slice(-2000)));
    } catch {}
  }
}

// Optional convenience for funnel
export const funnel = {
  landing: () => track("landing_view"),
  letsEat: () => track("lets_eat_clicked"),
  output: () => track("output_view"),
  feedback: () => track("feedback_view"),
  refer: () => track("refer_view"),
};
