import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NumberField, PhoneField, normalizePhone, parseLocalizedNumber } from "../src/fields";
import { axeViolations } from "./axe";

describe("parseLocalizedNumber", () => {
  it.each([
    ["١٢٣٤", 1234],
    ["١٬٢٣٤٫٥", 1234.5],
    ["۱۲۳", 123],
    ["1,234.5", 1234.5],
    ["−12", -12],
    ["٠٫٧٥", 0.75],
  ])("parses %s", (input, expected) => {
    expect(parseLocalizedNumber(input)).toBe(expected);
  });

  it("rejects text that is not a number", () => {
    expect(parseLocalizedNumber("abc")).toBeNull();
    expect(parseLocalizedNumber("1.2.3")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("converts Arabic-Indic digits and adds the country code", () => {
    expect(normalizePhone("٠٥٥٤ ١٧٥ ٩٩ ٤٥", "+90")).toEqual({ e164: "+905541759945", valid: true });
  });

  it("keeps an explicit + or 00 prefix", () => {
    expect(normalizePhone("00971 50 123 4567", "+90").e164).toBe("+971501234567");
    expect(normalizePhone("+44 7700 900123", "+90").e164).toBe("+447700900123");
  });

  it("flags numbers that are too short", () => {
    expect(normalizePhone("123", "+90").valid).toBe(false);
  });
});

describe("NumberField", () => {
  it("accepts Arabic digits and shows the value in the locale on blur", async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="العمر" locale="ar-EG" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("العمر");
    await userEvent.type(input, "٣٢");
    expect(onValueChange).toHaveBeenLastCalledWith(32);
    await userEvent.tab();
    expect(input).toHaveValue("٣٢");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("clamps to the allowed range on blur", async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Age" locale="en" minValue={18} maxValue={99} onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText("Age"), "150");
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(99);
    expect(screen.getByLabelText("Age")).toHaveValue("99");
  });

  it("ignores characters that can never form a number", async () => {
    render(<NumberField label="Age" />);
    await userEvent.type(screen.getByLabelText("Age"), "4a2b");
    expect(screen.getByLabelText("Age")).toHaveValue("42");
  });

  it("round-trips a currency format and stays editable", async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Budget" locale="en-US" formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Budget");
    await userEvent.type(input, "1500");
    await userEvent.tab();
    expect(input).toHaveValue("$1500");
    await userEvent.type(input, "0");
    expect(onValueChange).toHaveBeenLastCalledWith(15000);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("parses Arabic currency and percent formats", () => {
    const sar = { style: "currency", currency: "SAR" } as const;
    const formatted = new Intl.NumberFormat("ar-SA", sar).format(2500);
    expect(parseLocalizedNumber(formatted, { locale: "ar-SA", formatOptions: sar })).toBe(2500);
    expect(parseLocalizedNumber("٪٥٠", { locale: "ar-EG", formatOptions: { style: "percent" } })).toBe(0.5);
  });

  it("announces an error for text that is not a number", async () => {
    render(<NumberField label="Age" invalidMessage="Numbers only" />);
    await userEvent.type(screen.getByLabelText("Age"), "1.2.3");
    await userEvent.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Numbers only");
    expect(screen.getByLabelText("Age")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("PhoneField", () => {
  it("stays left-to-right inside an RTL page and reports E.164", async () => {
    const onPhoneChange = vi.fn();
    render(
      <div dir="rtl">
        <PhoneField label="رقم الجوال" countryCode="+966" onPhoneChange={onPhoneChange} />
      </div>,
    );
    const input = screen.getByLabelText("رقم الجوال");
    expect(input).toHaveAttribute("dir", "ltr");
    // Arabic-Indic digit groups would otherwise reorder; the value is aligned to the RTL start edge.
    expect(input.style.unicodeBidi).toBe("bidi-override");
    expect(input.style.textAlign).toBe("right");
    await userEvent.type(input, "٠٥٠١٢٣٤٥٦٧");
    expect(onPhoneChange).toHaveBeenLastCalledWith({ e164: "+966501234567", valid: true, raw: "٠٥٠ ١٢٣ ٤٥٦٧" });
  });

  it("aligns left on an LTR page", () => {
    render(<PhoneField label="Phone" />);
    expect(screen.getByLabelText("Phone").style.textAlign).toBe("left");
  });

  it("has no axe violations, including the error state", async () => {
    const { container } = render(
      <>
        <PhoneField label="Phone" hint="We reply on WhatsApp" countryCode="+90" />
        <NumberField label="Age" />
      </>,
    );
    await userEvent.type(screen.getByLabelText("Phone"), "12");
    await userEvent.tab();
    expect(await axeViolations(container)).toEqual([]);
  });
});
