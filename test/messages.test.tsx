import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Calendar } from "../src/calendar";
import { Combobox } from "../src/combobox";
import { PhoneField } from "../src/fields";
import { getMessages } from "../src/messages";
import { TimeSlotPicker } from "../src/time-slot-picker";

afterEach(() => document.documentElement.removeAttribute("lang"));

describe("built-in messages", () => {
  it("picks a language from a full locale and falls back to English", () => {
    expect(getMessages("ar-SA").nextMonth).toBe("الشهر التالي");
    expect(getMessages("tr-TR").noResults).toBe("Sonuç bulunamadı");
    expect(getMessages("de-DE").nextMonth).toBe("Next month");
  });

  it("labels the calendar's buttons in the calendar's locale", () => {
    render(<Calendar locale="ar-SA" today="2026-11-18" />);
    expect(screen.getByRole("button", { name: "الشهر السابق" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "الشهر التالي" })).toBeInTheDocument();
  });

  it("uses the page's lang when no locale is passed", async () => {
    document.documentElement.lang = "tr";
    render(<PhoneField label="Telefon" countryCode="+90" />);
    await userEvent.type(screen.getByLabelText("Telefon"), "12");
    await userEvent.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Telefon numarasının tamamını girin");
  });

  it("translates the combobox and time-slot empty states, and lets a prop override them", async () => {
    render(<Combobox label="المدينة" locale="ar" items={["Istanbul"]} getLabel={(x) => x} />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByRole("status")).toHaveTextContent("لا توجد نتائج");
  });

  it("shows the translated no-times message", () => {
    render(<TimeSlotPicker label="Saatler" locale="tr" date="2026-11-18" timeZone="Europe/Istanbul" start="09:00" end="09:00" stepMinutes={30} />);
    expect(screen.getByRole("status")).toHaveTextContent("Uygun saat yok");
  });
});
