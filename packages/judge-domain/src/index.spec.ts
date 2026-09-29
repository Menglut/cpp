import { describe, expect, it } from "vitest";
import { compareOutput } from "./index";

describe("compareOutput", () => {
  it("ignores whitespace differences for TOKEN comparison", () => {
    expect(compareOutput("1  2\n3", "1\n2 3\n", { comparator: "TOKEN" })).toBe(true);
  });

  it("rejects additional tokens", () => {
    expect(compareOutput("1 2 3", "1 2", { comparator: "TOKEN" })).toBe(false);
  });

  it("normalizes CRLF and optionally ignores one final newline for EXACT", () => {
    expect(compareOutput("hello\r\n", "hello", { comparator: "EXACT", allowFinalNewline: true })).toBe(true);
  });

  it("keeps internal whitespace significant for EXACT", () => {
    expect(compareOutput("a  b", "a b", { comparator: "EXACT" })).toBe(false);
  });
});
