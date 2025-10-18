export const PROMO_CODES = {
  FRIEND5: { type: "amount", value: 5 },
  EATFREE: { type: "percent", value: 100 },
  DINNER10: { type: "amount", value: 10 },
};

export function applyPromoFromQuery(searchParams) {
  const promo = searchParams?.get ? searchParams.get("promo") : null;
  if (!promo) return null;
  const code = promo.toUpperCase();
  if (PROMO_CODES[code]) {
    try {
      localStorage.setItem("dd_promo_pending", code);
      const raw = localStorage.getItem("dd_promo_counts");
      const obj = raw ? JSON.parse(raw) : { total: 0 };
      obj.total = (obj.total || 0) + 1;
      localStorage.setItem("dd_promo_counts", JSON.stringify(obj));
    } catch {}
    return code;
  }
  return null;
}

