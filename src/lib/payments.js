export function hasStripe() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
}

export async function startCheckoutMock(plan, promo) {
  const payload = { plan, promo: promo || null, ts: Date.now() };
  const ok = Math.random() < 0.9;
  await new Promise((r) => setTimeout(r, 800));
  if (ok) {
    try {
      const raw = localStorage.getItem("dd_payments");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ ...payload, status: "success" });
      localStorage.setItem("dd_payments", JSON.stringify(arr));
    } catch {}
    return { ok: true, payload };
  } else {
    try {
      const raw = localStorage.getItem("dd_payments");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ ...payload, status: "failed" });
      localStorage.setItem("dd_payments", JSON.stringify(arr));
    } catch {}
    return { ok: false, payload, error: "Payment failed (mock)" };
  }
}

// Placeholder for a real Stripe redirect in the future
export async function startRealCheckout(plan, promo) {
  console.warn("Stripe not fully wired. Falling back to mock.");
  return startCheckoutMock(plan, promo);
}

