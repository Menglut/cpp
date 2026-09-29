import { describe, expect, it } from "vitest";
import { extractMarkdownHeadings } from "./markdown-utils";

describe("extractMarkdownHeadings", () => {
  it("extracts headings and stable duplicate slugs", () => {
    expect(
      extractMarkdownHeadings("## 입력과 출력\n### 예제\n## 입력과 출력"),
    ).toEqual([
      { depth: 2, id: "입력과-출력", text: "입력과 출력" },
      { depth: 3, id: "예제", text: "예제" },
      { depth: 2, id: "입력과-출력-1", text: "입력과 출력" },
    ]);
  });
  it("ignores fenced code headings", () => {
    expect(
      extractMarkdownHeadings("```cpp\n## 코드 주석\n```\n## 실제 제목"),
    ).toEqual([{ depth: 2, id: "실제-제목", text: "실제 제목" }]);
  });
});
