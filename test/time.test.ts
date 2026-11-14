import { describe, expect, it } from "vitest";
import { formatSlot, generateSlots, zonedTimeToInstant } from "../src/time";

describe("zonedTimeToInstant", () => {
  it("converts Istanbul wall time (UTC+3, no DST) to UTC", () => {
    expect(zonedTimeToInstant("2026-11-18", "09:00", "Europe/Istanbul")?.toISOString()).toBe("2026-11-18T06:00:00.000Z");
  });

  it("handles a zone with DST on either side of the change", () => {
    // London: GMT in winter, BST (UTC+1) after 29 March 2026.
    expect(zonedTimeToInstant("2026-03-28", "10:00", "Europe/London")?.toISOString()).toBe("2026-03-28T10:00:00.000Z");
    expect(zonedTimeToInstant("2026-03-30", "10:00", "Europe/London")?.toISOString()).toBe("2026-03-30T09:00:00.000Z");
  });

  it("returns null for a time that falls in a DST gap", () => {
    // Clocks in New York jump from 02:00 to 03:00 on 8 March 2026.
    expect(zonedTimeToInstant("2026-03-08", "02:30", "America/New_York")).toBeNull();
  });
});

describe("generateSlots", () => {
  it("builds half-hour slots for a working window", () => {
    const slots = generateSlots({ date: "2026-11-18", timeZone: "Europe/Istanbul", start: "09:00", end: "11:00", stepMinutes: 30 });
    expect(slots.map((s) => s.wallTime)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
    expect(slots[0].iso).toBe("2026-11-18T06:00:00.000Z");
  });

  it("skips slots that don't exist on a DST change day", () => {
    const slots = generateSlots({ date: "2026-03-08", timeZone: "America/New_York", start: "01:00", end: "04:00", stepMinutes: 30 });
    expect(slots.map((s) => s.wallTime)).toEqual(["01:00", "01:30", "03:00", "03:30"]);
  });

  it("rejects a non-positive step", () => {
    expect(() => generateSlots({ date: "2026-11-18", timeZone: "UTC", start: "09:00", end: "10:00", stepMinutes: 0 })).toThrow(RangeError);
  });
});

describe("formatSlot", () => {
  const instant = new Date("2026-11-18T06:00:00Z");

  it("shows the time in the business's zone", () => {
    expect(formatSlot(instant, "en-GB", "Europe/Istanbul")).toBe("9:00");
  });

  it("uses Arabic-Indic digits for ar-EG", () => {
    expect(formatSlot(instant, "ar-EG", "Europe/Istanbul")).toMatch(/٩:٠٠/);
  });

  it("can show the same slot in the visitor's zone", () => {
    expect(formatSlot(instant, "en-GB", "Asia/Dubai")).toBe("10:00");
  });
});
