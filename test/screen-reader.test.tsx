/**
 * What a screen reader announces, in Arabic, using Guidepup's Virtual Screen Reader.
 * It follows the accessibility tree the way NVDA or VoiceOver would. It does not replace a pass with a
 * real screen reader, but it catches wrong roles, names, states and values in every CI run.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { virtual } from "@guidepup/virtual-screen-reader";
import { afterEach, describe, expect, it } from "vitest";
import { Calendar, Combobox, PhoneField, Slider, Tabs, TimeSlotPicker } from "../src";

afterEach(async () => {
  await virtual.stop();
});

const last = async () => (await virtual.spokenPhraseLog()).at(-1);

describe("screen reader announcements (Arabic, RTL)", () => {
  it("combobox: role, name, popup and autocomplete", async () => {
    const { container } = render(
      <div dir="rtl">
        <Combobox label="المدينة" locale="ar" items={["إسطنبول", "أنقرة"]} getLabel={(x) => x} />
      </div>,
    );
    await virtual.start({ container });
    await userEvent.click(screen.getByRole("combobox"));
    expect(await virtual.spokenPhraseLog()).toContain("combobox, المدينة, has popup listbox, not expanded, autocomplete in list, 1 control");
  });

  it("slider: value spoken in Arabic numerals and currency; ArrowLeft raises it in RTL", async () => {
    const { container } = render(
      <Slider label="الميزانية" dir="rtl" min={0} max={5000} step={500} defaultValue={1500} locale="ar-EG" formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />,
    );
    await virtual.start({ container });
    screen.getByRole("slider").focus();
    expect(await last()).toMatch(/^slider, الميزانية, .*current value .*١٬٥٠٠\sUS\$$/);
    await userEvent.keyboard("{ArrowLeft}");
    expect(await last()).toMatch(/٢٬٠٠٠\sUS\$$/);
  });

  it("calendar: full Hijri date, today and selection state", async () => {
    const { container } = render(<Calendar locale="ar-SA" calendar="islamic-umalqura" today="2026-11-18" dir="rtl" />);
    await virtual.start({ container });
    screen.getByRole("gridcell", { current: "date" }).focus();
    expect(await last()).toBe("gridcell, الأربعاء، ٨ جمادى الآخرة ١٤٤٨ هـ, current date, not selected");
    await userEvent.keyboard("{ArrowLeft}");
    expect(await last()).toBe("gridcell, الخميس، ٩ جمادى الآخرة ١٤٤٨ هـ, not selected");
  });

  it("time slots: the time in the visitor's zone and selection state", async () => {
    const { container } = render(
      <TimeSlotPicker label="المواعيد" dir="rtl" locale="ar-EG" date="2026-11-18" timeZone="Europe/Istanbul" displayTimeZone="Asia/Dubai" start="09:00" end="10:00" stepMinutes={30} value="2026-11-18T06:00:00.000Z" />,
    );
    await virtual.start({ container });
    screen.getAllByRole("gridcell")[0].focus();
    expect(await last()).toMatch(/^gridcell, ١٠:٠٠ ص, selected$/);
  });

  it("tabs: position and selection", async () => {
    const { container } = render(
      <Tabs
        label="نوع التقويم"
        dir="rtl"
        items={[
          { label: "ميلادي", content: "١" },
          { label: "هجري", content: "٢" },
        ]}
      />,
    );
    await virtual.start({ container });
    screen.getAllByRole("tab")[0].focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(await last()).toMatch(/^tab, هجري, .*selected/);
  });

  it("phone field: label, hint and error are all spoken", async () => {
    const { container } = render(
      <div dir="rtl" lang="ar">
        <PhoneField label="رقم الواتساب" hint="سنؤكد الحجز عبر الواتساب" countryCode="+90" locale="ar" />
      </div>,
    );
    await virtual.start({ container });
    const input = screen.getByLabelText("رقم الواتساب");
    await userEvent.type(input, "١٢");
    await userEvent.tab();
    input.focus();
    const spoken = (await virtual.spokenPhraseLog()).join(" | ");
    expect(spoken).toContain("رقم الواتساب");
    expect(spoken).toContain("سنؤكد الحجز عبر الواتساب");
    expect(spoken).toContain("أدخل رقم هاتف كاملًا");
  });
});
