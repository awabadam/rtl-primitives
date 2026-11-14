import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useDirection, type Direction } from "./direction";
import { formatSlot, generateSlots, type Slot, type SlotOptions } from "./time";

export interface UseSlotGridOptions {
  count: number;
  columns: number;
  dir: Direction;
  /** Index that holds the roving tab stop at first render. */
  initialIndex?: number;
  isDisabled?: (index: number) => boolean;
  onActivate?: (index: number) => void;
}

/**
 * Two-dimensional roving focus for a grid of choices. Left and Right follow reading order,
 * so in RTL the right arrow moves to the previous item, as a user reading right to left expects.
 */
export function useSlotGrid({ count, columns, dir, initialIndex = 0, isDisabled = () => false, onActivate }: UseSlotGridOptions) {
  const [focusIndex, setFocusIndex] = useState(Math.min(initialIndex, Math.max(count - 1, 0)));
  const cells = useRef<(HTMLElement | null)[]>([]);

  const focus = (index: number) => {
    setFocusIndex(index);
    cells.current[index]?.focus();
  };

  // Moves by `step`, skipping disabled cells, and stays put at the edges.
  const moveBy = (from: number, step: number) => {
    let i = from + step;
    while (i >= 0 && i < count && isDisabled(i)) i += step;
    if (i >= 0 && i < count) focus(i);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    const forward = dir === "rtl" ? -1 : 1;
    const rowStart = index - (index % columns);
    switch (event.key) {
      case "ArrowRight":
        moveBy(index, forward);
        break;
      case "ArrowLeft":
        moveBy(index, -forward);
        break;
      case "ArrowDown":
        moveBy(index, columns);
        break;
      case "ArrowUp":
        moveBy(index, -columns);
        break;
      case "Home":
        moveBy(event.ctrlKey ? -1 : rowStart - 1, 1);
        break;
      case "End":
        moveBy(event.ctrlKey ? count : Math.min(rowStart + columns, count), -1);
        break;
      case "Enter":
      case " ":
        if (!isDisabled(index)) onActivate?.(index);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const rows = useMemo(() => {
    const out: number[][] = [];
    for (let i = 0; i < count; i += columns) out.push(Array.from({ length: Math.min(columns, count - i) }, (_, k) => i + k));
    return out;
  }, [count, columns]);

  const getCellProps = (index: number) => ({
    ref: (el: HTMLElement | null) => {
      cells.current[index] = el;
    },
    tabIndex: index === focusIndex ? 0 : -1,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => onKeyDown(e, index),
    onFocus: () => setFocusIndex(index),
  });

  return { rows, focusIndex, getCellProps };
}

export interface TimeSlotPickerProps extends SlotOptions {
  /** Accessible name of the grid, e.g. "Available times on 18 November". */
  label: string;
  /** Locale used to show times, e.g. "ar-EG" for Arabic-Indic digits. Defaults to the browser's. */
  locale?: string;
  /** Zone the times are shown in. Defaults to `timeZone`. */
  displayTimeZone?: string;
  columns?: number;
  /** ISO instant of the selected slot. */
  value?: string | null;
  onChange?: (slot: Slot) => void;
  isSlotDisabled?: (slot: Slot) => boolean;
  /** Overrides automatic direction detection. */
  dir?: Direction;
  emptyMessage?: ReactNode;
  className?: string;
}

/**
 * An accessible grid of bookable times. Unstyled: target `[data-selected]`, `[data-disabled]` and
 * `[data-rtlp-time-slot-picker]` in your CSS.
 */
export function TimeSlotPicker({
  label,
  locale,
  displayTimeZone,
  columns = 4,
  value,
  onChange,
  isSlotDisabled,
  dir,
  emptyMessage = "No times available",
  className,
  ...slotOptions
}: TimeSlotPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const direction = useDirection(rootRef, dir);
  const { date, timeZone, start, end, stepMinutes } = slotOptions;
  const slots = useMemo(() => generateSlots({ date, timeZone, start, end, stepMinutes }), [date, timeZone, start, end, stepMinutes]);
  const disabled = (i: number) => !!isSlotDisabled?.(slots[i]);
  const selectedIndex = slots.findIndex((s) => s.iso === value);
  const firstEnabled = slots.findIndex((_, i) => !disabled(i));

  const grid = useSlotGrid({
    count: slots.length,
    columns,
    dir: direction,
    initialIndex: selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabled, 0),
    isDisabled: disabled,
    onActivate: (i) => onChange?.(slots[i]),
  });

  const fmtLocale = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en");
  const shownZone = displayTimeZone ?? timeZone;

  return (
    <div ref={rootRef} className={className} data-rtlp-time-slot-picker="" dir={dir}>
      {slots.length === 0 ? (
        <p role="status">{emptyMessage}</p>
      ) : (
        <div role="grid" aria-label={label}>
          {grid.rows.map((row, r) => (
            <div role="row" key={r}>
              {row.map((i) => {
                const slot = slots[i];
                const isSelected = slot.iso === value;
                const isDisabled = disabled(i);
                return (
                  <div
                    key={slot.iso}
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled || undefined}
                    data-selected={isSelected ? "" : undefined}
                    data-disabled={isDisabled ? "" : undefined}
                    onClick={() => !isDisabled && onChange?.(slot)}
                    {...grid.getCellProps(i)}
                  >
                    <time dateTime={slot.iso}>{formatSlot(slot.date, fmtLocale, shownZone)}</time>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
