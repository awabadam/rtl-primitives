import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useDirection, type Direction } from "./direction";

/** A calendar day as an ISO date string, "YYYY-MM-DD" (Gregorian). */
export type ISODate = string;

const DAY = 86_400_000;
const toUtc = (iso: ISODate) => Date.parse(`${iso}T12:00:00Z`);
const fromUtc = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: ISODate, n: number): ISODate => fromUtc(toUtc(iso) + n * DAY);

/**
 * First day of the week for a locale, 1 = Monday ... 7 = Sunday, from `Intl.Locale` week data.
 * Saudi Arabia starts on Sunday, Egypt on Saturday, Türkiye and the UK on Monday.
 */
export function firstDayOfWeek(locale: string): number {
  const loc = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
  return loc.getWeekInfo?.().firstDay ?? loc.weekInfo?.firstDay ?? 1;
}

/** ISO weekday of a date, 1 = Monday ... 7 = Sunday. */
const isoWeekday = (iso: ISODate) => ((new Date(toUtc(iso)).getUTCDay() + 6) % 7) + 1;

function calendarParts(iso: ISODate, calendar: string) {
  const f = new Intl.DateTimeFormat(`en-u-ca-${calendar}-nu-latn`, { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
  const p = Object.fromEntries(f.formatToParts(toUtc(iso)).map((x) => [x.type, x.value]));
  return { year: p.year ?? p.relatedYear, month: Number(p.month), day: Number(p.day) };
}

/** The days of the month that contains `iso`, in any `Intl` calendar ("gregory", "islamic-umalqura", "persian" ...). */
export function monthOf(iso: ISODate, calendar = "gregory"): ISODate[] {
  const key = (d: ISODate) => {
    const p = calendarParts(d, calendar);
    return `${p.year}-${p.month}`;
  };
  const k = key(iso);
  let start = iso;
  while (key(addDays(start, -1)) === k) start = addDays(start, -1);
  const days: ISODate[] = [];
  for (let d = start; key(d) === k; d = addDays(d, 1)) days.push(d);
  return days;
}

export interface UseCalendarOptions {
  locale: string;
  dir: Direction;
  /** "gregory" (default), "islamic-umalqura" for the Saudi Hijri calendar, or any other `Intl` calendar. */
  calendar?: string;
  value?: ISODate | null;
  onChange?: (date: ISODate) => void;
  /** Day that has focus when nothing is selected. Defaults to today. */
  defaultFocusedDate?: ISODate;
  isDateDisabled?: (date: ISODate) => boolean;
  /** Override the locale's week start: 1 = Monday ... 7 = Sunday. */
  weekStartsOn?: number;
  today?: ISODate;
}

/**
 * Month grid following the WAI-ARIA date-picker grid pattern, in any calendar and locale.
 * Left/Right follow reading order, so in RTL the left arrow moves to the next day.
 */
export function useCalendar({ locale, dir, calendar = "gregory", value = null, onChange, defaultFocusedDate, isDateDisabled = () => false, weekStartsOn, today = fromUtc(Date.now()) }: UseCalendarOptions) {
  const [focused, setFocused] = useState<ISODate>(value ?? defaultFocusedDate ?? today);
  const cells = useRef(new Map<ISODate, HTMLElement>());
  const pendingFocus = useRef(false);
  const weekStart = weekStartsOn ?? firstDayOfWeek(locale);
  const cal = `${locale}-u-ca-${calendar}`;

  const days = useMemo(() => monthOf(focused, calendar), [focused, calendar]);
  const weeks = useMemo(() => {
    const lead = (isoWeekday(days[0]) - weekStart + 7) % 7;
    const slots: (ISODate | null)[] = [...Array(lead).fill(null), ...days];
    while (slots.length % 7) slots.push(null);
    const out: (ISODate | null)[][] = [];
    for (let i = 0; i < slots.length; i += 7) out.push(slots.slice(i, i + 7));
    return out;
  }, [days, weekStart]);

  const weekdays = useMemo(() => {
    // 2026-01-05 is a Monday; step from it to the locale's first weekday.
    const monday = "2026-01-05";
    return Array.from({ length: 7 }, (_, i) => {
      const d = toUtc(addDays(monday, (weekStart - 1 + i) % 7));
      return {
        short: new Intl.DateTimeFormat(cal, { weekday: "narrow", timeZone: "UTC" }).format(d),
        long: new Intl.DateTimeFormat(cal, { weekday: "long", timeZone: "UTC" }).format(d),
      };
    });
  }, [cal, weekStart]);

  const monthLabel = new Intl.DateTimeFormat(cal, { month: "long", year: "numeric", timeZone: "UTC" }).format(toUtc(days[0]));
  const dayNumber = (d: ISODate) => new Intl.DateTimeFormat(cal, { day: "numeric", timeZone: "UTC" }).format(toUtc(d));
  const fullLabel = (d: ISODate) => new Intl.DateTimeFormat(cal, { dateStyle: "full", timeZone: "UTC" }).format(toUtc(d));

  const moveTo = (d: ISODate) => {
    pendingFocus.current = true;
    setFocused(d);
  };
  const shiftMonth = (n: number) => {
    const target = n > 0 ? addDays(days[days.length - 1], 1) : addDays(days[0], -1);
    const targetDays = monthOf(target, calendar);
    const dayIndex = days.indexOf(focused);
    return targetDays[Math.min(dayIndex, targetDays.length - 1)];
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, d: ISODate) => {
    const forward = dir === "rtl" ? -1 : 1;
    const weekPos = (isoWeekday(d) - weekStart + 7) % 7;
    switch (e.key) {
      case "ArrowRight":
        moveTo(addDays(d, forward));
        break;
      case "ArrowLeft":
        moveTo(addDays(d, -forward));
        break;
      case "ArrowDown":
        moveTo(addDays(d, 7));
        break;
      case "ArrowUp":
        moveTo(addDays(d, -7));
        break;
      case "Home":
        moveTo(addDays(d, -weekPos));
        break;
      case "End":
        moveTo(addDays(d, 6 - weekPos));
        break;
      case "PageDown":
        moveTo(shiftMonth(1));
        break;
      case "PageUp":
        moveTo(shiftMonth(-1));
        break;
      case "Enter":
      case " ":
        if (!isDateDisabled(d)) onChange?.(d);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const getCellProps = (d: ISODate) => ({
    ref: (el: HTMLElement | null) => {
      if (el) {
        cells.current.set(d, el);
        if (pendingFocus.current && d === focused) {
          pendingFocus.current = false;
          el.focus();
        }
      } else cells.current.delete(d);
    },
    role: "gridcell",
    tabIndex: d === focused ? 0 : -1,
    "aria-selected": d === value,
    "aria-disabled": isDateDisabled(d) || undefined,
    "aria-current": d === today ? ("date" as const) : undefined,
    "aria-label": fullLabel(d),
    "data-selected": d === value ? "" : undefined,
    "data-disabled": isDateDisabled(d) ? "" : undefined,
    "data-today": d === today ? "" : undefined,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => onKeyDown(e, d),
    onFocus: () => setFocused(d),
    onClick: () => {
      setFocused(d);
      if (!isDateDisabled(d)) onChange?.(d);
    },
  });

  return {
    weeks,
    weekdays,
    monthLabel,
    dayNumber,
    getCellProps,
    focused,
    previousMonth: () => setFocused(shiftMonth(-1)),
    nextMonth: () => setFocused(shiftMonth(1)),
  };
}

export interface CalendarProps extends Omit<UseCalendarOptions, "dir" | "locale"> {
  locale?: string;
  dir?: Direction;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

/** Unstyled reference calendar built on `useCalendar`. */
export function Calendar({ locale, dir, previousLabel = "Previous month", nextLabel = "Next month", className, ...options }: CalendarProps) {
  const root = useRef<HTMLDivElement>(null);
  const direction = useDirection(root, dir);
  const loc = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en");
  const c = useCalendar({ ...options, locale: loc, dir: direction });
  const headingId = `${useId().replace(/:/g, "")}-month`;

  return (
    <div ref={root} className={className} data-rtlp-calendar="" dir={dir}>
      <div data-rtlp-calendar-header="">
        {/* Logical order: the "previous" button sits at the reading start in both directions. */}
        <button type="button" aria-label={previousLabel} onClick={c.previousMonth}>
          <span aria-hidden="true">{direction === "rtl" ? "→" : "←"}</span>
        </button>
        <h2 id={headingId} aria-live="polite">
          {c.monthLabel}
        </h2>
        <button type="button" aria-label={nextLabel} onClick={c.nextMonth}>
          <span aria-hidden="true">{direction === "rtl" ? "←" : "→"}</span>
        </button>
      </div>
      <div role="grid" aria-labelledby={headingId}>
        <div role="row">
          {c.weekdays.map((w) => (
            <div role="columnheader" key={w.long} aria-label={w.long}>
              <abbr title={w.long}>{w.short}</abbr>
            </div>
          ))}
        </div>
        {c.weeks.map((week, i) => (
          <div role="row" key={i}>
            {week.map((d, j) =>
              d ? (
                <div key={d} {...c.getCellProps(d)}>
                  {c.dayNumber(d)}
                </div>
              ) : (
                <div key={`empty-${j}`} role="gridcell" aria-hidden="true" />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
