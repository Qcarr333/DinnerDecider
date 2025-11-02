export function getTimeCategory(date = new Date()) {
  const hour = date.getHours();
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  if (hour >= 3 && hour < 6) return "Early Riser";
  if (hour >= 6 && hour < 11) return "Breakfast";
  if (isWeekend && hour >= 9 && hour < 14) return "Brunch";
  if (hour >= 11 && hour < 15) return "Lunch";
  if (hour >= 15 && hour < 17) return "Snack";
  if (hour >= 17 && hour < 22) return "Dinner";
  if (hour >= 22 || hour < 3) return "Late Night";
  return "Dinner";
}
