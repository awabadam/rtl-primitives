import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { useDirection, type Direction } from "./direction";
import { getMessages } from "./messages";
import { editPhone, formatPhone } from "./phone-format";

const toWesternDigits = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });

// Bidi marks that Intl inserts around numbers in Arabic and Hebrew formats (LRM, RLM, ALM).
const BIDI_MARKS = /[\u200E\u200F\u061C]/g;

export interface NumberParseOptions {
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

/** Characters a formatted number can carry besides digits: currency, percent, units and literals for that locale. */
function affixCharacters({ locale, formatOptions }: NumberParseOptions): Set<string> {
  const chars = new Set<string>();
  if (!formatOptions) return chars;
  const parts = new Intl.NumberFormat(locale, formatOptions).formatToParts(-1234.5);
  for (const part of parts) {
    if (["currency", "percentSign", "unit", "literal", "plusSign", "minusSign"].includes(part.type)) {
      for (const ch of part.value.replace(BIDI_MARKS, "")) if (ch.trim()) chars.add(ch);
    }
  }
  return chars;
}

const DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;
const SEPARATORS = new Set([".", ",", "\u066B", "\u066C", " ", "\u00A0", "\u202F", "-", "\u2212", "+"]);

/**
 * True when every character could belong to a number: digits in any of the three systems, decimal and
 * group separators, signs, and the currency or percent symbols that `formatOptions` produces.
 * NumberField uses it to ignore keystrokes that can never form a number.
 */
export function isNumberInput(text: string, options: NumberParseOptions = {}): boolean {
  const affixes = affixCharacters(options);
  for (const ch of text.replace(BIDI_MARKS, "")) {
    if (!DIGIT.test(ch) && !SEPARATORS.has(ch) && !affixes.has(ch)) return false;
  }
  return true;
}

/**
 * Parses a number typed with Western, Arabic-Indic (٠-٩) or Persian (۰-۹) digits.
 * Accepts the Arabic decimal separator (٫), drops group separators (٬ , and spaces) and, when
 * `formatOptions` are given, the currency or percent symbols of that format ("US$1,500", "٪٥٠").
 * Percent formats return the fraction (50% -> 0.5), matching `Intl.NumberFormat`.
 * Returns `null` when the text is not a number.
 */
export function parseLocalizedNumber(text: string, options: NumberParseOptions = {}): number | null {
  let cleaned = toWesternDigits(text.replace(BIDI_MARKS, ""));
  for (const ch of affixCharacters(options)) if (ch !== "-" && ch !== "\u2212") cleaned = cleaned.split(ch).join("");
  cleaned = cleaned
    .replace(/[\u066C,\s\u00A0\u202F]/g, "")
    .replace(/\u066B/g, ".")
    .replace(/^[\u2212]/, "-")
    .replace(/^\+/, "");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return options.formatOptions?.style === "percent" ? n / 100 : n;
}

/**
 * Normalises a phone number typed in any digit system to E.164 (+ and digits).
 * A number without a leading + or 00 gets `countryCode`, with one trunk 0 removed.
 */
export function normalizePhone(text: string, countryCode = ""): { e164: string; valid: boolean } {
  let s = toWesternDigits(text).replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) s = `${countryCode.startsWith("+") ? countryCode : `+${countryCode}`}${s.replace(/^0/, "")}`;
  s = `+${s.slice(1).replace(/\+/g, "")}`;
  const digits = s.length - 1;
  return { e164: s, valid: digits >= 8 && digits <= 15 };
}

interface FieldBase {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

export interface NumberFieldProps extends FieldBase, Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  /** Locale used to show the value after the field loses focus. */
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
  minValue?: number;
  maxValue?: number;
  /** Message shown when the text is not a number. */
  invalidMessage?: ReactNode;
}

/** A number input that accepts any digit system and shows the value in the viewer's locale. */
export function NumberField({ label, hint, error, className, value, defaultValue = null, onValueChange, locale, formatOptions, minValue, maxValue, invalidMessage, ...rest }: NumberFieldProps) {
  const id = useId().replace(/:/g, "");
  const format = (n: number | null) => (n === null ? "" : new Intl.NumberFormat(locale, { useGrouping: false, ...formatOptions }).format(n));
  const [text, setText] = useState(format(value ?? defaultValue));
  const [touched, setTouched] = useState(false);
  const parseOpts = { locale, formatOptions };
  const parsed = text.trim() === "" ? null : parseLocalizedNumber(text, parseOpts);
  const unparsable = text.trim() !== "" && parsed === null;
  const message = error ?? (touched && unparsable ? (invalidMessage ?? getMessages(locale).invalidNumber) : null);

  return (
    <div className={className} data-rtlp-field="">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        {...rest}
        id={`${id}-input`}
        type="text"
        inputMode="decimal"
        value={text}
        aria-invalid={message ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", message ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(e) => {
          // Ignore keystrokes that can never form a number, as React Aria's NumberField does.
          if (!isNumberInput(e.target.value, parseOpts)) return;
          setText(e.target.value);
          const n = e.target.value.trim() === "" ? null : parseLocalizedNumber(e.target.value, parseOpts);
          if (n !== null || e.target.value.trim() === "") onValueChange?.(n);
        }}
        onBlur={(e) => {
          setTouched(true);
          if (parsed !== null) {
            const clamped = Math.min(maxValue ?? Infinity, Math.max(minValue ?? -Infinity, parsed));
            if (clamped !== parsed) onValueChange?.(clamped);
            setText(format(clamped));
          }
          rest.onBlur?.(e);
        }}
      />
      {hint ? <p id={`${id}-hint`}>{hint}</p> : null}
      {message ? (
        <p id={`${id}-error`} role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export interface PhoneFieldProps extends FieldBase, Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "dir"> {
  /** Locale for built-in messages. Defaults to the page's `lang`. */
  locale?: string;
  /** Group digits as the user types ("0554 175 99 45"), in whichever digit system they use. Default true. */
  formatAsYouType?: boolean;
  /** Page direction. Detected from the nearest `dir` when omitted; it only decides which side the number is aligned to. */
  dir?: Direction;
  /** Used when the number has no + or 00 prefix, e.g. "+90". */
  countryCode?: string;
  onPhoneChange?: (phone: { e164: string; valid: boolean; raw: string }) => void;
  invalidMessage?: ReactNode;
}

/**
 * Styles that keep a phone number in typed order. `dir="ltr"` alone is not enough: Arabic-Indic digits
 * are "Arabic Number" characters in the Unicode Bidi Algorithm, so spaces between digit groups resolve
 * right-to-left and "٠٥٥٤ ١٧٥ ٩٩" displays as "٩٩ ١٧٥ ٠٥٥٤". Overriding the bidi algorithm for the
 * field keeps every character in the order it was typed. The value is aligned to the page's start edge.
 */
export function phoneInputStyle(pageDir: Direction): CSSProperties {
  return { direction: "ltr", unicodeBidi: "bidi-override", textAlign: pageDir === "rtl" ? "right" : "left" };
}

/**
 * A phone input that keeps "+" and every digit group in typed order inside RTL pages,
 * accepts Arabic-Indic and Persian digits, and reports the number in E.164.
 */
export function PhoneField({ label, hint, error, className, countryCode = "", onPhoneChange, invalidMessage, dir, locale, formatAsYouType = true, ...rest }: PhoneFieldProps) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const pageDir = useDirection(root, dir);
  const initial = String(rest.defaultValue ?? "");
  const [raw, setRaw] = useState(formatAsYouType ? formatPhone(initial, countryCode) : initial);

  // Restore the caret after React writes the reformatted value.
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && input.current && document.activeElement === input.current) {
      input.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });
  const [touched, setTouched] = useState(false);
  const phone = normalizePhone(raw, countryCode);
  const message = error ?? (touched && raw.trim() !== "" && !phone.valid ? (invalidMessage ?? getMessages(locale).invalidPhone) : null);

  return (
    <div ref={root} className={className} data-rtlp-field="">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        {...rest}
        ref={input}
        style={{ ...phoneInputStyle(pageDir), ...rest.style }}
        defaultValue={undefined}
        id={`${id}-input`}
        type="tel"
        inputMode="tel"
        autoComplete={rest.autoComplete ?? "tel"}
        dir="ltr"
        value={raw}
        aria-invalid={message ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", message ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(e) => {
          let next = e.target.value;
          if (formatAsYouType) {
            const edited = editPhone(raw, next, e.target.selectionStart ?? next.length, countryCode);
            next = edited.value;
            pendingCaret.current = edited.caret;
          }
          setRaw(next);
          onPhoneChange?.({ ...normalizePhone(next, countryCode), raw: next });
        }}
        onBlur={(e) => {
          setTouched(true);
          rest.onBlur?.(e);
        }}
      />
      {hint ? <p id={`${id}-hint`}>{hint}</p> : null}
      {message ? (
        <p id={`${id}-error`} role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
