import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "../src/tabs";
import { axeViolations } from "./axe";

const items = [
  { label: "الأسنان", content: "محتوى ١" },
  { label: "الشعر", content: "محتوى ٢" },
  { label: "التجميل", content: "محتوى ٣" },
];

describe("Tabs", () => {
  it("links tabs to panels and shows only the selected panel", () => {
    render(<Tabs label="الأقسام" items={items} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", tabs[0].id);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("محتوى ١");
  });

  it("moves to the next tab with ArrowLeft in RTL", async () => {
    render(
      <div dir="rtl">
        <Tabs label="الأقسام" items={items} />
      </div>,
    );
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(tabs[2]).toHaveFocus(); // wraps from the first tab back to the last
  });

  it("moves to the next tab with ArrowRight in LTR, with Home and End", async () => {
    render(<Tabs label="Sections" items={items} dir="ltr" />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[1]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(tabs[2]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(tabs[0]).toHaveFocus();
  });

  it("waits for Enter in manual activation", async () => {
    const onChange = vi.fn();
    render(<Tabs label="Sections" items={items} dir="ltr" activation="manual" onChange={onChange} />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Tabs label="Sections" items={items} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
