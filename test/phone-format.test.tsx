import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PhoneField } from "../src/fields";
import { editPhone, formatPhone } from "../src/phone-format";

describe("formatPhone", () => {
  it.each([
    ["05541759945", "+90", "0554 175 99 45"],
    ["+905541759945", "", "+90 554 175 99 45"],
    ["0501234567", "+966", "050 123 4567"],
    ["00971501234567", "", "00971 50 123 4567"],
    ["+447700900123", "", "+44 7700 900123"],
    ["+33612345678", "", "+33 6 12 34 56 78"],
    ["+9647701234567", "", "+964 770 123 4567"],
    ["+8613812345678", "", "+861 381 234 567 8"],
  ])("formats %s (%s) as %s", (input, cc, expected) => {
    expect(formatPhone(input, cc)).toBe(expected);
  });

  it("keeps Arabic-Indic and Persian digits in the system they were typed in", () => {
    expect(formatPhone("٠٥٥٤١٧٥٩٩٤٥", "+90")).toBe("٠٥٥٤ ١٧٥ ٩٩ ٤٥");
    expect(formatPhone("+۹۶۶۵۰۱۲۳۴۵۶۷")).toBe("+۹۶۶ ۵۰ ۱۲۳ ۴۵۶۷");
  });
});

describe("editPhone caret", () => {
  it("keeps the caret after the digit just typed when a space is inserted", () => {
    // Typing the 5th digit at the end: "0554" + "1" -> "0554 1", caret after "1".
    expect(editPhone("0554", "05541", 5, "+90")).toEqual({ value: "0554 1", caret: 6 });
  });

  it("deletes the digit before a group space on Backspace", () => {
    // "0554 175" with the caret after the space; Backspace removes the space, so the 4 goes instead.
    expect(editPhone("0554 175", "0554175", 4, "+90")).toEqual({ value: "0551 75", caret: 3 });
  });
});

describe("PhoneField formatting", () => {
  it("groups Arabic-Indic digits as they are typed", async () => {
    render(<PhoneField label="رقم الجوال" countryCode="+90" />);
    const input = screen.getByLabelText("رقم الجوال");
    await userEvent.type(input, "٠٥٥٤١٧٥٩٩٤٥");
    expect(input).toHaveValue("٠٥٥٤ ١٧٥ ٩٩ ٤٥");
  });

  it("keeps the caret in place when inserting a digit mid-number", async () => {
    render(<PhoneField label="Phone" countryCode="+90" defaultValue="05541759945" />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    expect(input).toHaveValue("0554 175 99 45");
    input.focus();
    input.setSelectionRange(4, 4); // after "0554"
    await userEvent.keyboard("{Backspace}");
    expect(input).toHaveValue("0551 759 94 5");
    expect(input.selectionStart).toBe(3);
  });

  it("can be turned off", async () => {
    render(<PhoneField label="Phone" formatAsYouType={false} />);
    await userEvent.type(screen.getByLabelText("Phone"), "05541759945");
    expect(screen.getByLabelText("Phone")).toHaveValue("05541759945");
  });
});
