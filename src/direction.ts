import { useLayoutEffect, useState, type RefObject } from "react";

export type Direction = "ltr" | "rtl";

/** Reads the writing direction an element actually renders with: its own `dir`, an ancestor's, or CSS. */
export function getDirection(el: Element | null): Direction {
  if (!el) return "ltr";
  const attr = el.closest("[dir]")?.getAttribute("dir");
  if (attr === "rtl" || attr === "ltr") return attr;
  const css = typeof getComputedStyle === "function" ? getComputedStyle(el).direction : "";
  return css === "rtl" ? "rtl" : "ltr";
}

/** React hook form of `getDirection`. Pass `dir` to override detection. */
export function useDirection(ref: RefObject<Element | null>, dir?: Direction): Direction {
  const [detected, setDetected] = useState<Direction>(dir ?? "ltr");
  useLayoutEffect(() => {
    if (!dir) setDetected(getDirection(ref.current));
  }, [ref, dir]);
  return dir ?? detected;
}
