import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "../src/slider";
import { axeViolations } from "./axe";

describe("Slider", () => {
  it("exposes value, range and a localised value text", () => {
    render(<Slider label="الميزانية" min={0} max={5000} step={500} defaultValue={1500} locale="ar-EG" formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />);
    const s = screen.getByRole("slider");
    expect(s).toHaveAttribute("aria-valuenow", "1500");
    expect(s).toHaveAttribute("aria-valuemin", "0");
    expect(s.getAttribute("aria-valuetext")).toMatch(/١٬?٥٠٠/);
  });

  it("increases with ArrowRight in LTR and ArrowLeft in RTL", async () => {
    const { unmount } = render(<Slider label="Budget" dir="ltr" defaultValue={10} />);
    screen.getByRole("slider").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "11");
    unmount();

    render(<Slider label="الميزانية" dir="rtl" defaultValue={10} />);
    screen.getByRole("slider").focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "11");
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "9");
  });

  it("supports Up/Down, PageUp/PageDown, Home/End and clamps to the range", async () => {
    const onChange = vi.fn();
    render(<Slider label="Budget" dir="ltr" min={0} max={100} step={5} defaultValue={50} onChange={onChange} />);
    const s = screen.getByRole("slider");
    s.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(s).toHaveAttribute("aria-valuenow", "55");
    await userEvent.keyboard("{PageUp}");
    expect(s).toHaveAttribute("aria-valuenow", "65");
    await userEvent.keyboard("{End}{ArrowRight}");
    expect(s).toHaveAttribute("aria-valuenow", "100");
    await userEvent.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("measures pointer position from the right edge in RTL", () => {
    render(<Slider label="الميزانية" dir="rtl" min={0} max={100} />);
    const track = document.querySelector<HTMLElement>("[data-rtlp-track]")!;
    track.getBoundingClientRect = () => ({ left: 0, right: 200, width: 200, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON() {} });
    fireEvent.pointerDown(track, { clientX: 150, pointerId: 1 });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "25");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Slider label="Budget" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
