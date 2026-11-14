/** Built-in strings. Every one can still be overridden with the component's own prop. */
export interface Messages {
  previousMonth: string;
  nextMonth: string;
  noTimes: string;
  noResults: string;
  invalidNumber: string;
  invalidPhone: string;
}

export const messages: Record<"en" | "ar" | "tr", Messages> = {
  en: {
    previousMonth: "Previous month",
    nextMonth: "Next month",
    noTimes: "No times available",
    noResults: "No results",
    invalidNumber: "Enter a number",
    invalidPhone: "Enter a full phone number",
  },
  ar: {
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    noTimes: "لا توجد مواعيد متاحة",
    noResults: "لا توجد نتائج",
    invalidNumber: "أدخل رقمًا",
    invalidPhone: "أدخل رقم هاتف كاملًا",
  },
  tr: {
    previousMonth: "Önceki ay",
    nextMonth: "Sonraki ay",
    noTimes: "Uygun saat yok",
    noResults: "Sonuç bulunamadı",
    invalidNumber: "Bir sayı girin",
    invalidPhone: "Telefon numarasının tamamını girin",
  },
};

/** The locale to use: the one passed in, else the page's `lang`, else the browser's, else English. */
export function resolveLocale(locale?: string): string {
  if (locale) return locale;
  if (typeof document !== "undefined" && document.documentElement.lang) return document.documentElement.lang;
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en";
}

/** Built-in strings for a locale, falling back to English for languages without a translation. */
export function getMessages(locale?: string): Messages {
  const language = resolveLocale(locale).split("-")[0].toLowerCase();
  return messages[language as keyof typeof messages] ?? messages.en;
}
