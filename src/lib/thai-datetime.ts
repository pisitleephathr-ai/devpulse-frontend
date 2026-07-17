/**
 * Thai date/time helpers, all computed in the Asia/Bangkok timezone so the
 * greeting and "today" never shift a day because of the viewer's local zone
 * or UTC conversion.
 */

const BKK = "Asia/Bangkok";

/** The current wall-clock hour (0-23) in Bangkok. */
export function bangkokHour(date: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: BKK,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  // "24" can appear at midnight in some environments → normalize to 0.
  return Number(h) % 24;
}

/** Bangkok calendar date as YYYY-MM-DD (safe for <input type="date"> + filters). */
export function bangkokDateISO(date: Date = new Date()): string {
  // en-CA yields ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BKK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Time-of-day greeting per the product's Bangkok-time rules. */
export function getThaiGreeting(date: Date = new Date()): string {
  const h = bangkokHour(date);
  if (h >= 5 && h < 11) return "สวัสดีตอนเช้า";
  if (h >= 11 && h < 13) return "สวัสดีตอนเที่ยง";
  if (h >= 13 && h < 17) return "สวัสดีตอนบ่าย";
  if (h >= 17 && h < 19) return "สวัสดีตอนเย็น";
  return "สวัสดีตอนกลางคืน"; // 19:00–04:59
}

/** Full Thai date, Buddhist era, e.g. "วันศุกร์ที่ 10 กรกฎาคม 2569". */
export function formatThaiDateFull(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BKK,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Current Bangkok wall-clock time, 24h, e.g. "16:04:32". */
export function formatThaiTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BKK,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** Short Thai date, e.g. "10 ก.ค. 2569". */
export function formatThaiDateShort(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BKK,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Short Thai date from a YYYY-MM-DD string (parsed as a Bangkok calendar day). */
export function thaiDateShortFromISO(iso: string): string {
  // Append midday to avoid any zone rollover when constructing the Date.
  return formatThaiDateShort(new Date(`${iso}T12:00:00+07:00`));
}
