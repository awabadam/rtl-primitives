import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useDirection, type Direction } from "./direction";

export interface UseTabsOptions {
  count: number;
  dir: Direction;
  /** "automatic" selects a tab as focus moves onto it; "manual" waits for Enter or Space. */
  activation?: "automatic" | "manual";
  selectedIndex?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  orientation?: "horizontal" | "vertical";
  id?: string;
}

/**
 * WAI-ARIA tabs. In a horizontal tab list, Left and Right follow reading order,
 * so in RTL the left arrow moves to the next tab.
 */
export function useTabs({ count, dir, activation = "automatic", selectedIndex, defaultIndex = 0, onChange, orientation = "horizontal", id }: UseTabsOptions) {
  const autoId = useId().replace(/:/g, "");
  const base = id ?? `tabs${autoId}`;
  const [inner, setInner] = useState(defaultIndex);
  const selected = selectedIndex ?? inner;
  const [focused, setFocused] = useState(selected);
  const tabs = useRef<(HTMLElement | null)[]>([]);

  const select = (i: number) => {
    if (selectedIndex === undefined) setInner(i);
    onChange?.(i);
  };

  const focusTab = (i: number) => {
    const next = (i + count) % count;
    setFocused(next);
    tabs.current[next]?.focus();
    if (activation === "automatic") select(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, i: number) => {
    const forward = dir === "rtl" ? -1 : 1;
    const [prevKey, nextKey] = orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
    switch (e.key) {
      case nextKey:
        focusTab(i + (orientation === "vertical" ? 1 : forward));
        break;
      case prevKey:
        focusTab(i - (orientation === "vertical" ? 1 : forward));
        break;
      case "Home":
        focusTab(0);
        break;
      case "End":
        focusTab(count - 1);
        break;
      case "Enter":
      case " ":
        select(i);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const getTabListProps = (label: string) => ({ role: "tablist", "aria-label": label, "aria-orientation": orientation });

  const getTabProps = (i: number) => ({
    ref: (el: HTMLElement | null) => {
      tabs.current[i] = el;
    },
    role: "tab",
    id: `${base}-tab-${i}`,
    "aria-selected": i === selected,
    "aria-controls": `${base}-panel-${i}`,
    tabIndex: i === selected ? 0 : -1,
    "data-selected": i === selected ? "" : undefined,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => onKeyDown(e, i),
    onClick: () => {
      setFocused(i);
      select(i);
    },
  });

  const getPanelProps = (i: number) => ({
    role: "tabpanel",
    id: `${base}-panel-${i}`,
    "aria-labelledby": `${base}-tab-${i}`,
    hidden: i !== selected,
    tabIndex: 0,
  });

  return { selected, focused, getTabListProps, getTabProps, getPanelProps };
}

export interface TabsProps extends Omit<UseTabsOptions, "count" | "dir"> {
  label: string;
  items: readonly { label: ReactNode; content: ReactNode }[];
  dir?: Direction;
  className?: string;
}

/** Unstyled reference tabs built on `useTabs`. */
export function Tabs({ label, items, dir, className, ...options }: TabsProps) {
  const root = useRef<HTMLDivElement>(null);
  const direction = useDirection(root, dir);
  const tabs = useTabs({ ...options, count: items.length, dir: direction });
  return (
    <div ref={root} className={className} data-rtlp-tabs="" dir={dir}>
      <div {...tabs.getTabListProps(label)}>
        {items.map((item, i) => (
          <button type="button" key={i} {...tabs.getTabProps(i)}>
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div key={i} {...tabs.getPanelProps(i)}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
