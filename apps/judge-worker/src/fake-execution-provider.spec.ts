import { describe, expect, it } from "vitest";
import { FakeExecutionProvider } from "./fake-execution-provider";

describe("FakeExecutionProvider", () => {
  const provider = new FakeExecutionProvider();

  it("returns the supplied expected output for the development success path", async () => {
    const result = await provider.execute({
      language: "CPP17",
      sourceCode: "int main() {}",
      stdin: "3 5",
      expectedOutput: "8",
    });
    expect(result.status).toBe("SUCCESS");
    expect(result.stdout).toBe("8");
    expect(result.diagnostic).toContain("FAKE_PROVIDER");
  });

  it("supports an explicit wrong-answer scenario marker", async () => {
    const result = await provider.execute({
      language: "CPP17",
      sourceCode: "// FAKE:WA",
      stdin: "",
      expectedOutput: "expected",
    });
    expect(result.status).toBe("SUCCESS");
    expect(result.stdout).not.toBe("expected");
  });

  it("supports an explicit compiler-error scenario marker", async () => {
    const result = await provider.execute({
      language: "CPP17",
      sourceCode: "// FAKE:CE",
      stdin: "",
    });
    expect(result.status).toBe("CE");
    expect(result.compileOutput).toBeTruthy();
  });
});
