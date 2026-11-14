import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeForSearch } from "../src/arabic";

describe("normalizeForSearch", () => {
  it("strips harakat and tatweel", () => {
    expect(normalizeForSearch("مُحَمَّد")).toBe("محمد");
    expect(normalizeForSearch("إسطنـــبول")).toBe("اسطنبول");
  });

  it("folds alef, ta marbuta and alef maqsura forms", () => {
    expect(normalizeForSearch("أحمد")).toBe(normalizeForSearch("احمد"));
    expect(normalizeForSearch("عيادة")).toBe(normalizeForSearch("عياده"));
    expect(normalizeForSearch("مصطفى")).toBe(normalizeForSearch("مصطفي"));
  });

  it("folds Arabic-Indic and Persian digits to Western digits", () => {
    expect(normalizeForSearch("٢٠٢٦")).toBe("2026");
    expect(normalizeForSearch("۱۴")).toBe("14");
  });

  it("lowercases Latin text", () => {
    expect(normalizeForSearch("  Istanbul ")).toBe("istanbul");
  });
});

describe("matchesSearch", () => {
  it("matches a bare query against a fully vowelled label", () => {
    expect(matchesSearch("زِرَاعَةُ الشَّعْرِ", "زراعه الشعر")).toBe(true);
  });

  it("treats an empty query as a match", () => {
    expect(matchesSearch("anything", "")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesSearch("تبييض الأسنان", "زراعة")).toBe(false);
  });
});
