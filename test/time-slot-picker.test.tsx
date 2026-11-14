import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeSlotPicker } from "../src/time-slot-picker";
import { axeViolations } from "./axe";

const base = { date: "2026-11-18", timeZone: "Europe/Istanbul", start: "09:00", end: "11:00", stepMinutes: 30, columns: 2 } as const;

function cells() {
  return screen.getAllByRole("gridcell");
}

describe("TimeSlotPicker", () => {
  it("renders one cell per slot in rows of `columns`", () => {
    render(<TimeSlotPicker {...base} label="Times" locale="en-GB" />);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(cells().map((c) => c.textContent)).toEqual(["9:00", "9:30", "10:00", "10:30"]);
  });

  it("keeps a single tab stop", () => {
    render(<TimeSlotPicker {...base} label="Times" locale="en-GB" />);
    expect(cells().filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });

  it("moves forward with ArrowRight in LTR", async () => {
    render(<TimeSlotPicker {...base} label="Times" locale="en-GB" dir="ltr" />);
    cells()[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(cells()[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(cells()[3]).toHaveFocus();
  });

  it("moves forward with ArrowLeft in RTL", async () => {
    render(<TimeSlotPicker {...base} label="الأوقات" locale="ar-EG" dir="rtl" />);
    cells()[0].focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(cells()[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(cells()[0]).toHaveFocus();
  });

  it("detects RTL from an ancestor's dir attribute", async () => {
    render(
      <div dir="rtl">
        <TimeSlotPicker {...base} label="الأوقات" locale="ar" />
      </div>,
    );
    cells()[0].focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(cells()[1]).toHaveFocus();
  });

  it("skips disabled slots and selects with Enter", async () => {
    const onChange = vi.fn();
    render(<TimeSlotPicker {...base} label="Times" locale="en-GB" dir="ltr" onChange={onChange} isSlotDisabled={(s) => s.wallTime === "09:30"} />);
    cells()[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(cells()[2]).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ wallTime: "10:00", iso: "2026-11-18T07:00:00.000Z" }));
    expect(cells()[1]).toHaveAttribute("aria-disabled", "true");
  });

  it("marks the selected slot", () => {
    render(<TimeSlotPicker {...base} label="Times" locale="en-GB" value="2026-11-18T06:30:00.000Z" />);
    expect(cells()[1]).toHaveAttribute("aria-selected", "true");
    expect(cells()[1].tabIndex).toBe(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(<TimeSlotPicker {...base} label="Times" locale="en-GB" value="2026-11-18T06:30:00.000Z" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
