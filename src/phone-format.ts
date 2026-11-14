/**
 * Format-as-you-type for phone numbers that works with Arabic-Indic and Persian digits.
 *
 * intl-tel-input turns formatting off for non-ASCII digits because the caret jumps. Here the caret is
 * tracked by how many significant characters (digits and "+") sit before it, not by string index, so
 * inserting or removing group spaces never moves it, whatever digit system is used.
 */

/**
 * Digit groups of the national (mobile) number for common calling codes, weighted to the Middle East,
 * North Africa and Europe. An unknown code is not split off, and the digits after "+" are grouped in 3s.
 */
const GROUPS: Record<string, number[]> = {
  "1": [3, 3, 4], // US, Canada
  "7": [3, 3, 2, 2], // Russia, Kazakhstan
  "31": [1, 8], // Netherlands
  "33": [1, 2, 2, 2, 2], // France
  "49": [3, 8], // Germany (mobile)
  "91": [5, 5], // India
  "92": [3, 7], // Pakistan
  "98": [3, 3, 4], // Iran
  "20": [3, 3, 4], // Egypt
  "44": [4, 6], // United Kingdom
  "90": [3, 3, 2, 2], // Türkiye
  "212": [3, 6], // Morocco
  "213": [3, 2, 2, 2], // Algeria
  "216": [2, 3, 3], // Tunisia
  "218": [2, 3, 4], // Libya
  "249": [2, 3, 4], // Sudan
  "961": [2, 3, 3], // Lebanon
  "962": [1, 4, 4], // Jordan
  "963": [3, 3, 3], // Syria
  "964": [3, 3, 4], // Iraq
  "965": [4, 4], // Kuwait
  "966": [2, 3, 4], // Saudi Arabia
  "968": [4, 4], // Oman
  "971": [2, 3, 4], // UAE
  "973": [4, 4], // Bahrain
  "974": [4, 4], // Qatar
};

const WESTERN = "0123456789";
const ARABIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

type DigitSystem = typeof WESTERN | typeof ARABIC | typeof PERSIAN;

const isSignificant = (ch: string) => ch === "+" || WESTERN.includes(ch) || ARABIC.includes(ch) || PERSIAN.includes(ch);
const toWestern = (ch: string) => (ARABIC.includes(ch) ? String(ARABIC.indexOf(ch)) : PERSIAN.includes(ch) ? String(PERSIAN.indexOf(ch)) : ch);

/** The digit system the user is typing in: the last non-Western digit wins, so switching keyboards mid-number converges. */
function digitSystem(text: string): DigitSystem {
  for (let i = text.length - 1; i >= 0; i--) {
    if (ARABIC.includes(text[i])) return ARABIC;
    if (PERSIAN.includes(text[i])) return PERSIAN;
  }
  return WESTERN;
}

const group = (digits: string, sizes: number[]) => {
  const out: string[] = [];
  let i = 0;
  for (const size of sizes) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + size));
    i += size;
  }
  while (i < digits.length) {
    out.push(digits.slice(i, i + 3));
    i += 3;
  }
  return out.join(" ");
};

/** Count of significant characters (digits and "+") in `text` before `index`. */
export function significantBefore(text: string, index: number): number {
  let n = 0;
  for (let i = 0; i < index && i < text.length; i++) if (isSignificant(text[i])) n++;
  return n;
}

/** String index just after the `count`-th significant character of `text`. */
export function indexAfterSignificant(text: string, count: number): number {
  if (count <= 0) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (isSignificant(text[i]) && ++n === count) return i + 1;
  }
  return text.length;
}

/**
 * Groups a phone number for display, keeping the digit system it was typed in.
 * "+90554..." -> "+90 554 175 99 45"; "0554..." with countryCode "+90" -> "0554 175 99 45".
 */
export function formatPhone(text: string, countryCode = ""): string {
  const system = digitSystem(text);
  let s = Array.from(text).filter(isSignificant).map(toWestern).join("");
  s = s.replace(/(?!^)\+/g, "");
  let out: string;
  if (s.startsWith("+") || s.startsWith("00")) {
    const prefix = s.startsWith("+") ? "+" : "00";
    const rest = s.slice(prefix.length);
    const cc = [3, 2, 1].map((n) => rest.slice(0, n)).find((c) => c in GROUPS);
    if (cc === undefined) {
      out = `${prefix}${group(rest, [])}`;
    } else {
      const national = rest.slice(cc.length);
      out = `${prefix}${cc}${national ? ` ${group(national, GROUPS[cc])}` : ""}`;
    }
  } else {
    const sizes = GROUPS[countryCode.replace(/^\+/, "")] ?? [];
    const trunk = s.startsWith("0") ? "0" : "";
    const national = s.slice(trunk.length);
    const grouped = group(national, sizes);
    // Keep the trunk 0 attached to the first group: "0554 175 99 45".
    out = `${trunk}${grouped}`;
  }
  return system === WESTERN ? out : out.replace(/[0-9]/g, (d) => system[Number(d)]);
}

/**
 * Applies an edit to a formatted phone value and returns the new value and caret.
 * Deleting a group space with Backspace deletes the digit before it, as users expect.
 */
export function editPhone(previous: string, next: string, caret: number, countryCode = "") {
  let input = next;
  let sig = significantBefore(next, caret);
  const removedOnlySeparator =
    next.length < previous.length && significantBefore(next, next.length) === significantBefore(previous, previous.length);
  if (removedOnlySeparator && sig > 0) {
    const cut = indexAfterSignificant(next, sig);
    input = next.slice(0, cut - 1) + next.slice(cut);
    sig -= 1;
  }
  const value = formatPhone(input, countryCode);
  return { value, caret: indexAfterSignificant(value, sig) };
}
