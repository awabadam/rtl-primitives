import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useDirection } from "../src/direction";

function Probe() {
  const ref = useRef<HTMLSpanElement>(null);
  return <span ref={ref} data-testid="probe">{useDirection(ref)}</span>;
}

afterEach(() => document.documentElement.removeAttribute("dir"));

describe("useDirection", () => {
  it("follows a dir change on <html> made after mount", async () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("ltr");
    await act(async () => {
      document.documentElement.setAttribute("dir", "rtl");
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId("probe")).toHaveTextContent("rtl");
  });
});
