/**
 * Search helpers for Arabic text.
 *
 * Users type Arabic without diacritics, mix the forms of alef, and use either
 * Arabic-Indic, Persian or Western digits. A plain `includes` misses most of
 * those matches, so labels and queries are normalised the same way first.
 */

// Harakat, Quranic annotation marks, superscript alef and tatweel.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

const LETTER_FOLDS: Record<string, string> = {
  "آ": "ا", // آ -> ا
  "أ": "ا", // أ -> ا
  "إ": "ا", // إ -> ا
  "ٱ": "ا", // ٱ -> ا
  "ة": "ه", // ة -> ه
  "ى": "ي", // ى -> ي
  "ؤ": "و", // ؤ -> و
  "ئ": "ي", // ئ -> ي
  "ی": "ي", // Persian ی -> ي
  "ک": "ك", // Persian ک -> ك
};

function foldDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    return String((code >= 0x06f0 ? code - 0x06f0 : code - 0x0660));
  });
}

/** Normalise text for matching: strips diacritics, folds letter variants and digits, lowercases Latin. */
export function normalizeForSearch(text: string): string {
  return foldDigits(
    text
      .normalize("NFKC")
      .replace(DIACRITICS, "")
      .replace(/[آأإٱةىؤئیک]/g, (c) => LETTER_FOLDS[c] ?? c),
  )
    .toLocaleLowerCase()
    .trim();
}

/** True when `label` contains `query` after both are normalised. An empty query matches everything. */
export function matchesSearch(label: string, query: string): boolean {
  const q = normalizeForSearch(query);
  return q === "" || normalizeForSearch(label).includes(q);
}
