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

/**
 * React hook form of `getDirection`. It re-reads the direction whenever any `dir` attribute in the
 * document changes, so a language switch that sets `<html dir>` after this component mounted
 * (a common order: children's effects run before the app's) is still picked up.
 * Pass `dir` to override detection.
 */
export function useDirection(ref: RefObject<Element | null>, dir?: Direction): Direction {
  const [detected, setDetected] = useState<Direction>(dir ?? "ltr");
  useLayoutEffect(() => {
    if (dir) return;
    const update = () => setDetected(getDirection(ref.current));
    update();
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"], subtree: true });
    return () => observer.disconnect();
  }, [ref, dir]);
  return dir ?? detected;
}
