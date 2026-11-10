export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatPlace(address, parts = 2) {
  if (typeof address !== "string") return "";
  const genericPart = /^(india|republic of india|karnataka|maharashtra|(?:pin(?:code)?|postal code)\s*[:\-]?\s*\d{5,6}|\d{5,6}(?:-\d{4})?|[A-Z0-9]{2,4}\+[A-Z0-9]{2,4})$/i;
  const seen = new Set();
  const meaningfulParts = address.split(",").map((part) => part
    .replace(/\b(?:pin(?:code)?|postal code)\s*[:\-]?\s*\d{5,6}\b/gi, "")
    .replace(/\b\d{6}(?:-\d{4})?\b/g, "")
    .trim()).filter((part) => {
    const key = part.toLocaleLowerCase();
    if (!part || genericPart.test(part) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const limit = Number.isFinite(parts) ? Math.max(1, Math.floor(parts)) : 2;
  return meaningfulParts.slice(0, limit).join(", ");
}
