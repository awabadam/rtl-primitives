import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Calendar, firstDayOfWeek, monthOf } from "../src/calendar";
import { axeViolations } from "./axe";

const today = "2026-11-18";

function rows() {
  return screen.getAllByRole("row").slice(1);
}
function cell(label: RegExp | string) {
  return screen.getByRole("gridcell", { name: label });
}

describe("firstDayOfWeek and monthOf", () => {
  it("reads the week start from locale data", () => {
    expect(firstDayOfWeek("ar-SA")).toBe(7);
    expect(firstDayOfWeek("ar-EG")).toBe(6);
    expect(firstDayOfWeek("tr-TR")).toBe(1);
  });

  it("returns whole months in the Gregorian and Hijri calendars", () => {
    const g = monthOf(today);
    expect([g[0], g.at(-1), g.length]).toEqual(["2026-11-01", "2026-11-30", 30]);
    // Jumada al-Akhirah 1448 in the Umm al-Qura calendar.
    const h = monthOf(today, "islamic-umalqura");
    expect([h[0], h.at(-1), h.length]).toEqual(["2026-11-11", "2026-12-09", 29]);
  });
});

describe("Calendar", () => {
  it("starts the week on Sunday for ar-SA and Saturday for ar-EG", () => {
    const { unmount } = render(<Calendar locale="ar-SA" today={today} />);
    // 1 November 2026 is a Sunday: first column in Saudi Arabia.
    expect(within(rows()[0]).getAllByRole("gridcell")[0]).toHaveAttribute("aria-label", expect.stringContaining("١"));
    unmount();
    render(<Calendar locale="ar-EG" today={today} />);
    const first = Array.from(rows()[0].children);
    expect(first[0]).toHaveAttribute("aria-hidden", "true"); // Saturday 31 October is outside the month
    expect(first[1].textContent).toBe("١");
  });

  it("shows a Hijri month with Arabic numerals", () => {
    render(<Calendar locale="ar-SA" calendar="islamic-umalqura" today={today} />);
    expect(screen.getByRole("heading")).toHaveTextContent(/جمادى الآخرة ١٤٤٨/);
    expect(screen.getByRole("gridcell", { current: "date" })).toHaveTextContent("٨");
  });

  it("moves forward with ArrowLeft in RTL and by week with ArrowDown", async () => {
    render(<Calendar locale="ar-SA" dir="rtl" today={today} />);
    const start = screen.getByRole("gridcell", { current: "date" });
    start.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toHaveAttribute("aria-label", expect.stringContaining("١٩"));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toHaveAttribute("aria-label", expect.stringContaining("٢٦"));
  });

  it("crosses into the next month with PageDown and selects with Enter", async () => {
    const onChange = vi.fn();
    render(<Calendar locale="en-GB" dir="ltr" today={today} onChange={onChange} />);
    screen.getByRole("gridcell", { current: "date" }).focus();
    await userEvent.keyboard("{PageDown}");
    expect(screen.getByRole("heading")).toHaveTextContent("December 2026");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-12-18");
  });

  it("does not select disabled days", async () => {
    const onChange = vi.fn();
    const fridays = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 5;
    render(<Calendar locale="en-GB" today={today} onChange={onChange} isDateDisabled={fridays} />);
    const friday = cell(/Friday,? 20 November 2026/);
    expect(friday).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(friday);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves months with the header buttons", async () => {
    render(<Calendar locale="en-GB" today={today} />);
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading")).toHaveTextContent("December 2026");
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading")).toHaveTextContent("October 2026");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Calendar locale="ar-SA" calendar="islamic-umalqura" today={today} value="2026-11-20" dir="rtl" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
