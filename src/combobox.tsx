import {
  useCallback,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { matchesSearch } from "./arabic";

export interface UseComboboxOptions<T> {
  items: readonly T[];
  /** Text shown for an item and used for matching. */
  getLabel: (item: T) => string;
  /** Custom filter. Defaults to Arabic-aware, diacritic-insensitive matching. */
  filter?: (item: T, query: string) => boolean;
  onSelect?: (item: T) => void;
  /** Base id for the generated element ids. */
  id?: string;
}

/**
 * Headless combobox following the WAI-ARIA 1.2 "editable combobox with list autocomplete" pattern.
 * Up/Down keys are direction-neutral, so it behaves the same in RTL and LTR layouts.
 */
export function useCombobox<T>({ items, getLabel, filter, onSelect, id }: UseComboboxOptions<T>) {
  const autoId = useId();
  const baseId = id ?? `cbx${autoId.replace(/:/g, "")}`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-option-${i}`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = useMemo(
    () => items.filter((item) => (filter ? filter(item, query) : matchesSearch(getLabel(item), query))),
    [items, query, filter, getLabel],
  );

  const select = useCallback(
    (index: number) => {
      const item = results[index];
      if (item === undefined) return;
      setQuery(getLabel(item));
      setOpen(false);
      setActiveIndex(-1);
      onSelect?.(item);
    },
    [results, getLabel, onSelect],
  );

  const move = (delta: number) => {
    if (results.length === 0) return;
    if (!open) {
      setOpen(true);
      setActiveIndex(delta > 0 ? 0 : results.length - 1);
      return;
    }
    setActiveIndex((i) => (i + delta + results.length) % results.length);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (event.altKey) setOpen(true);
        else move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Enter":
        if (open && activeIndex >= 0) {
          event.preventDefault();
          select(activeIndex);
        }
        break;
      case "Escape":
        event.preventDefault();
        if (open) {
          setOpen(false);
          setActiveIndex(-1);
        } else {
          setQuery("");
        }
        break;
      case "Tab":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const getInputProps = (props: InputHTMLAttributes<HTMLInputElement> = {}): InputHTMLAttributes<HTMLInputElement> => ({
    ...props,
    id: `${baseId}-input`,
    role: "combobox",
    type: "text",
    autoComplete: "off",
    "aria-autocomplete": "list",
    "aria-expanded": open,
    "aria-controls": listboxId,
    "aria-activedescendant": open && activeIndex >= 0 ? optionId(activeIndex) : undefined,
    value: query,
    onChange: (e) => {
      setQuery(e.target.value);
      setOpen(true);
      setActiveIndex(-1);
      props.onChange?.(e);
    },
    onKeyDown: (e) => {
      onKeyDown(e);
      props.onKeyDown?.(e);
    },
    onBlur: (e) => {
      setOpen(false);
      setActiveIndex(-1);
      props.onBlur?.(e);
    },
  });

  const getListboxProps = (props: HTMLAttributes<HTMLElement> = {}): HTMLAttributes<HTMLElement> => ({
    ...props,
    id: listboxId,
    role: "listbox",
    hidden: !open || results.length === 0,
  });

  const getOptionProps = (index: number, props: HTMLAttributes<HTMLElement> = {}): HTMLAttributes<HTMLElement> & { "data-active"?: "" } => ({
    ...props,
    id: optionId(index),
    role: "option",
    "aria-selected": index === activeIndex,
    "data-active": index === activeIndex ? "" : undefined,
    // Keep focus in the input while clicking an option.
    onMouseDown: (e) => {
      e.preventDefault();
      props.onMouseDown?.(e);
    },
    onClick: (e) => {
      select(index);
      props.onClick?.(e);
    },
    onMouseMove: (e) => {
      setActiveIndex(index);
      props.onMouseMove?.(e);
    },
  });

  return { query, setQuery, open, setOpen, activeIndex, results, select, getInputProps, getListboxProps, getOptionProps, inputId: `${baseId}-input` };
}

export interface ComboboxProps<T> extends UseComboboxOptions<T> {
  label: ReactNode;
  placeholder?: string;
  /** Rendered when the query matches nothing. */
  emptyMessage?: ReactNode;
  renderOption?: (item: T, state: { active: boolean }) => ReactNode;
  className?: string;
}

/** Unstyled reference component built on `useCombobox`. Style it with the `data-*` attributes and your own classes. */
export function Combobox<T>({ label, placeholder, emptyMessage, renderOption, className, ...options }: ComboboxProps<T>) {
  const cbx = useCombobox(options);
  return (
    <div className={className} data-rtlp-combobox="">
      <label htmlFor={cbx.inputId}>{label}</label>
      <input {...cbx.getInputProps({ placeholder })} />
      <ul {...cbx.getListboxProps()}>
        {cbx.results.map((item, i) => (
          <li key={i} {...cbx.getOptionProps(i)}>
            {renderOption ? renderOption(item, { active: i === cbx.activeIndex }) : options.getLabel(item)}
          </li>
        ))}
      </ul>
      {cbx.open && cbx.results.length === 0 && cbx.query !== "" && emptyMessage ? (
        <div role="status">{emptyMessage}</div>
      ) : null}
    </div>
  );
}
