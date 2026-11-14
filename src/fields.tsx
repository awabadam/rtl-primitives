import { useId, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { useDirection, type Direction } from "./direction";

const toWesternDigits = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });

/**
 * Parses a number typed with Western, Arabic-Indic (٠-٩) or Persian (۰-۹) digits.
 * Accepts the Arabic decimal separator (٫) and drops thousands separators (٬ , and spaces).
 * Returns `null` when the text is not a number.
 */
export function parseLocalizedNumber(text: string): number | null {
  const cleaned = toWesternDigits(text)
    .replace(/[٬,\s  ]/g, "")
    .replace(/٫/g, ".")
    .replace(/^[−]/, "-");
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  return Number(cleaned);
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
export function NumberField({ label, hint, error, className, value, defaultValue = null, onValueChange, locale, formatOptions, minValue, maxValue, invalidMessage = "Enter a number", ...rest }: NumberFieldProps) {
  const id = useId().replace(/:/g, "");
  const format = (n: number | null) => (n === null ? "" : new Intl.NumberFormat(locale, { useGrouping: false, ...formatOptions }).format(n));
  const [text, setText] = useState(format(value ?? defaultValue));
  const [touched, setTouched] = useState(false);
  const parsed = text.trim() === "" ? null : parseLocalizedNumber(text);
  const unparsable = text.trim() !== "" && parsed === null;
  const message = error ?? (touched && unparsable ? invalidMessage : null);

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
          setText(e.target.value);
          const n = e.target.value.trim() === "" ? null : parseLocalizedNumber(e.target.value);
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
export function PhoneField({ label, hint, error, className, countryCode = "", onPhoneChange, invalidMessage = "Enter a full phone number", dir, ...rest }: PhoneFieldProps) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const pageDir = useDirection(root, dir);
  const [raw, setRaw] = useState(String(rest.defaultValue ?? ""));
  const [touched, setTouched] = useState(false);
  const phone = normalizePhone(raw, countryCode);
  const message = error ?? (touched && raw.trim() !== "" && !phone.valid ? invalidMessage : null);

  return (
    <div ref={root} className={className} data-rtlp-field="">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        {...rest}
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
          setRaw(e.target.value);
          onPhoneChange?.({ ...normalizePhone(e.target.value, countryCode), raw: e.target.value });
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
