import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../src/combobox";
import { axeViolations } from "./axe";

const cities = ["إسطنبول", "أنقرة", "إزمير", "Istanbul", "Ankara"];

function setup(onSelect = vi.fn(), dir: "rtl" | "ltr" = "rtl") {
  const utils = render(
    <div dir={dir}>
      <Combobox label="المدينة" items={cities} getLabel={(c) => c} onSelect={onSelect} emptyMessage="لا توجد نتائج" />
    </div>,
  );
  return { ...utils, input: screen.getByRole("combobox"), onSelect };
}

describe("Combobox", () => {
  it("filters Arabic labels without diacritics or hamza", async () => {
    const { input } = setup();
    await userEvent.type(input, "اسطنبول");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["إسطنبول"]);
  });

  it("moves the active option with the arrow keys and wires aria-activedescendant", async () => {
    const { input } = setup();
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("option");
    expect(input).toHaveAttribute("aria-activedescendant", options[0].id);
    await userEvent.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", options[options.length - 1].id);
  });

  it("selects with Enter and closes", async () => {
    const { input, onSelect } = setup();
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("أنقرة");
    expect(input).toHaveValue("أنقرة");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on the first Escape and clears on the second", async () => {
    const { input } = setup();
    await userEvent.type(input, "an");
    expect(input).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("an");
    await userEvent.keyboard("{Escape}");
    expect(input).toHaveValue("");
  });

  it("selects on click without losing focus", async () => {
    const { input, onSelect } = setup();
    await userEvent.type(input, "ank");
    await userEvent.click(screen.getByRole("option", { name: "Ankara" }));
    expect(onSelect).toHaveBeenCalledWith("Ankara");
    expect(input).toHaveFocus();
  });

  it("announces an empty result", async () => {
    const { input } = setup();
    await userEvent.type(input, "xyz");
    expect(screen.getByRole("status")).toHaveTextContent("لا توجد نتائج");
  });

  it("has no axe violations, closed or open", async () => {
    const { container, input } = setup();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    expect(await axeViolations(container)).toEqual([]);
  });
});
