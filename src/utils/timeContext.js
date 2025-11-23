export function resolveTimeCategory(hour24, dayOfWeek = null) {
  const clampedHour = Number.isFinite(hour24) ? ((Math.floor(hour24) % 24) + 24) % 24 : 0;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (clampedHour >= 3 && clampedHour < 6) return "Early Riser";
  if (clampedHour >= 6 && clampedHour < 11) return "Breakfast";
  if (isWeekend && clampedHour >= 9 && clampedHour < 14) return "Brunch";
  if (clampedHour >= 11 && clampedHour < 15) return "Lunch";
  if (clampedHour >= 15 && clampedHour < 17) return "Snack";
  if (clampedHour >= 17 && clampedHour < 22) return "Dinner";
  if (clampedHour >= 22 || clampedHour < 3) return "Late Night";
  return "Dinner";
}

export function getTimeCategory(date = new Date()) {
  const hour = date.getHours();
  const day = date.getDay();
  return resolveTimeCategory(hour, day);
}

export function getTimeCategoryForLocalDate(dateISO, hour24, utcOffsetMinutes = 0) {
  if (!dateISO || !Number.isFinite(hour24)) return null;
  const base = new Date(`${dateISO}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return resolveTimeCategory(hour24);
  }
  const offsetMs = Number.isFinite(utcOffsetMinutes) ? utcOffsetMinutes * 60000 : 0;
  const adjusted = new Date(base.getTime() + offsetMs);
  const dayIndex = adjusted.getUTCDay();
  return resolveTimeCategory(hour24, dayIndex);
}
