/**
 * Time-slot helpers built only on `Intl`, so they work in every locale and IANA time zone
 * without a date library.
 */

export interface Slot {
  /** UTC instant, ISO 8601. Store and send this. */
  iso: string;
  date: Date;
  /** Wall-clock time in the slot's zone, "HH:MM". */
  wallTime: string;
}

export interface SlotOptions {
  /** Calendar day in the target zone, "YYYY-MM-DD". */
  date: string;
  /** IANA zone the business works in, e.g. "Europe/Istanbul". */
  timeZone: string;
  /** First slot, "HH:MM", inclusive. */
  start: string;
  /** End of the working window, "HH:MM", exclusive. */
  end: string;
  stepMinutes: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** The wall-clock fields of an instant in a zone. */
export function wallClock(instant: Date, timeZone: string) {
  const parts = Object.fromEntries(zoneFormatter(timeZone).formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of `timeZone` from UTC at `instant`, in minutes. */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/**
 * The UTC instant for a wall-clock time in a zone, or `null` when that time does not exist
 * there (it falls in a daylight-saving gap).
 */
export function zonedTimeToInstant(date: string, time: string, timeZone: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  let instant = new Date(guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60000);
  // A second pass settles the offset when the first guess crossed a DST change.
  instant = new Date(guess - zoneOffsetMinutes(instant, timeZone) * 60000);
  const w = wallClock(instant, timeZone);
  return w.year === y && w.month === m && w.day === d && w.hour === h && w.minute === min ? instant : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Slots between `start` and `end` on `date` in `timeZone`. Times that don't exist on that day are skipped. */
export function generateSlots({ date, timeZone, start, end, stepMinutes }: SlotOptions): Slot[] {
  if (stepMinutes <= 0) throw new RangeError("stepMinutes must be positive");
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const slots: Slot[] = [];
  for (let t = toMinutes(start); t < toMinutes(end); t += stepMinutes) {
    const wallTime = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    const instant = zonedTimeToInstant(date, wallTime, timeZone);
    if (instant) slots.push({ iso: instant.toISOString(), date: instant, wallTime });
  }
  return slots;
}

/** Formats a slot for display: the viewer's locale (and numbering system), shown in `timeZone`. */
export function formatSlot(instant: Date, locale: string, timeZone: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone, ...options }).format(instant);
}
