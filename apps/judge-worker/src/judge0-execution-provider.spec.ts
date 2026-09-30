import { describe, expect, it, vi } from "vitest";
import { Judge0ExecutionProvider } from "./judge0-execution-provider";

const options = {
  baseUrl: "http://judge0.test:2358",
  authHeader: "X-Judge0-Token",
  authToken: "test-secret",
  languages: {
    C11: { languageId: 50, compilerVersion: "C test compiler" },
    CPP17: { languageId: 54, compilerVersion: "C++ test compiler" },
  },
  requestTimeoutMs: 1000,
  executionTimeoutMs: 5000,
  pollIntervalMs: 0,
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Judge0ExecutionProvider", () => {
  it("submits asynchronously, polls, and decodes an accepted result", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(jsonResponse({ token: "submission-token" }))
      .mockResolvedValueOnce(
        jsonResponse({ status: { id: 2, description: "Processing" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: { id: 3, description: "Accepted" },
          stdout: Buffer.from("42\n").toString("base64"),
          stderr: null,
          compile_output: null,
          time: "0.012",
          memory: 2048,
        }),
      );
    const provider = new Judge0ExecutionProvider(options, {
      fetch: fetchMock as typeof fetch,
      sleep: async () => undefined,
    });

    const result = await provider.execute({
      language: "CPP17",
      sourceCode: "int main() {}",
      stdin: "21",
      timeLimitMs: 1000,
      memoryLimitKiB: 131072,
    });

    expect(result).toMatchObject({
      status: "SUCCESS",
      stdout: "42\n",
      executionTimeMs: 12,
      memoryUsageKiB: 2048,
    });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain("wait=false");
    expect(new Headers(request?.headers).get("X-Judge0-Token")).toBe("test-secret");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      language_id: 54,
      enable_network: false,
      memory_limit: 131072,
    });
  });

  it("maps compilation errors and decodes compiler output", async () => {
    const fetchMock = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(jsonResponse({ token: "submission-token" }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: { id: 6, description: "Compilation Error" },
          stdout: null,
          stderr: null,
          compile_output: Buffer.from("error: expected ';'").toString("base64"),
          time: null,
          memory: null,
        }),
      );
    const provider = new Judge0ExecutionProvider(options, {
      fetch: fetchMock as typeof fetch,
      sleep: async () => undefined,
    });

    const result = await provider.execute({
      language: "C11",
      sourceCode: "broken",
      stdin: "",
    });

    expect(result.status).toBe("CE");
    expect(result.compileOutput).toContain("expected ';'");
    expect(result.compilerVersion).toBe("C test compiler");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      language_id: 50,
    });
  });
});

type Fetch = typeof fetch;
