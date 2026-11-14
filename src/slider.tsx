import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useDirection, type Direction } from "./direction";

export interface UseSliderOptions {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  dir: Direction;
  /** Locale for the spoken and shown value, e.g. "ar-EG" for Arabic-Indic digits. */
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * WAI-ARIA slider. In RTL the track runs right to left, so the minimum sits on the right,
 * ArrowLeft increases the value and a click is measured from the right edge.
 */
export function useSlider({ min = 0, max = 100, step = 1, value, defaultValue, onChange, dir, locale, formatOptions }: UseSliderOptions) {
  const [inner, setInner] = useState(defaultValue ?? min);
  const current = clamp(value ?? inner, min, max);
  const trackRef = useRef<HTMLElement | null>(null);
  const formatter = new Intl.NumberFormat(locale, formatOptions);

  const snap = (n: number) => clamp(Math.round((n - min) / step) * step + min, min, max);
  const set = (n: number) => {
    const next = Number(snap(n).toFixed(10));
    if (next === current) return;
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const forward = dir === "rtl" ? -1 : 1;
    const big = Math.max(step, (max - min) / 10);
    const deltas: Record<string, number> = {
      ArrowRight: step * forward,
      ArrowLeft: -step * forward,
      ArrowUp: step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
    };
    if (e.key in deltas) set(current + deltas[e.key]);
    else if (e.key === "Home") set(min);
    else if (e.key === "End") set(max);
    else return;
    e.preventDefault();
  };

  const valueFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return current;
    const fromStart = dir === "rtl" ? rect.right - clientX : clientX - rect.left;
    return min + clamp(fromStart / rect.width, 0, 1) * (max - min);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    set(valueFromPointer(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) set(valueFromPointer(e.clientX));
  };

  const percent = max === min ? 0 : ((current - min) / (max - min)) * 100;

  return {
    value: current,
    percent,
    valueText: formatter.format(current),
    getTrackProps: () => ({
      ref: (el: HTMLElement | null) => {
        trackRef.current = el;
      },
      onPointerDown,
      onPointerMove,
      style: { "--rtlp-percent": `${percent}%` } as CSSProperties,
      "data-dir": dir,
    }),
    getThumbProps: (labelledBy?: string) => ({
      role: "slider",
      tabIndex: 0,
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": current,
      "aria-valuetext": formatter.format(current),
      "aria-labelledby": labelledBy,
      "aria-orientation": "horizontal" as const,
      onKeyDown,
    }),
  };
}

export interface SliderProps extends Omit<UseSliderOptions, "dir"> {
  label: ReactNode;
  dir?: Direction;
  className?: string;
}

/**
 * Unstyled reference slider. The track carries `--rtlp-percent`; position the thumb with
 * `inset-inline-start: var(--rtlp-percent)` and it lands correctly in both directions.
 */
export function Slider({ label, dir, className, ...options }: SliderProps) {
  const root = useRef<HTMLDivElement>(null);
  const direction = useDirection(root, dir);
  const slider = useSlider({ ...options, dir: direction });
  const labelId = `${useId().replace(/:/g, "")}-label`;
  return (
    <div ref={root} className={className} data-rtlp-slider="" dir={dir}>
      <span id={labelId}>{label}</span>
      <output aria-hidden="true">{slider.valueText}</output>
      <div data-rtlp-track="" {...slider.getTrackProps()}>
        <div data-rtlp-range="" />
        <div data-rtlp-thumb="" {...slider.getThumbProps(labelId)} />
      </div>
    </div>
  );
}
