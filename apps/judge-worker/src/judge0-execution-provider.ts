import type {
  ExecutionProvider,
  ProviderRequest,
  ProviderResult,
  ProviderStatus,
} from "./execution-provider";

type FetchLike = typeof fetch;

type Judge0Status = {
  id: number;
  description: string;
};

type Judge0Submission = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status: Judge0Status;
};

export type Judge0ProviderOptions = {
  baseUrl: string;
  authHeader: string;
  authToken: string;
  languageId: number;
  compilerVersion: string;
  requestTimeoutMs: number;
  executionTimeoutMs: number;
  pollIntervalMs: number;
};

type Judge0ProviderDependencies = {
  fetch?: FetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
};

const terminalStatusIds = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

function decodeBase64(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  return Buffer.from(value, "base64").toString("utf8");
}

function mapStatus(status: Judge0Status): ProviderStatus {
  switch (status.id) {
    case 3:
      return "SUCCESS";
    case 5:
      return "TLE";
    case 6:
      return "CE";
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 14:
      return "RE";
    case 13:
    default:
      return "SYSTEM_ERROR";
  }
}

function parseExecutionTimeMs(value: string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : undefined;
}

export class Judge0ExecutionProvider implements ExecutionProvider {
  private readonly fetchImplementation: FetchLike;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly baseUrl: string;

  constructor(
    private readonly options: Judge0ProviderOptions,
    dependencies: Judge0ProviderDependencies = {},
  ) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImplementation = dependencies.fetch ?? fetch;
    this.sleep =
      dependencies.sleep ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async healthCheck(): Promise<void> {
    const response = await this.request("/about");
    if (!response.ok) {
      throw new Error(`Judge0 health check failed with HTTP ${response.status}`);
    }
  }

  async execute(request: ProviderRequest): Promise<ProviderResult> {
    const submissionResponse = await this.request(
      "/submissions?base64_encoded=true&wait=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: Buffer.from(request.sourceCode, "utf8").toString("base64"),
          stdin: Buffer.from(request.stdin, "utf8").toString("base64"),
          language_id: this.options.languageId,
          cpu_time_limit: Math.max((request.timeLimitMs ?? 1000) / 1000, 0.1),
          wall_time_limit: Math.max((request.timeLimitMs ?? 1000) / 500 + 1, 2),
          memory_limit: request.memoryLimitKiB ?? 131072,
          enable_network: false,
        }),
      },
    );
    if (!submissionResponse.ok) {
      throw new Error(`Judge0 submission failed with HTTP ${submissionResponse.status}`);
    }

    const created = (await submissionResponse.json()) as { token?: string };
    if (!created.token) throw new Error("Judge0 did not return a submission token");

    const deadline = Date.now() + this.options.executionTimeoutMs;
    while (Date.now() < deadline) {
      const resultResponse = await this.request(
        `/submissions/${encodeURIComponent(created.token)}?base64_encoded=true`,
      );
      if (!resultResponse.ok) {
        throw new Error(`Judge0 polling failed with HTTP ${resultResponse.status}`);
      }
      const result = (await resultResponse.json()) as Judge0Submission;
      if (terminalStatusIds.has(result.status.id)) return this.toProviderResult(result);
      await this.sleep(this.options.pollIntervalMs);
    }

    throw new Error("Judge0 execution polling timed out");
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set(this.options.authHeader, this.options.authToken);
    return this.fetchImplementation(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(this.options.requestTimeoutMs),
    });
  }

  private toProviderResult(result: Judge0Submission): ProviderResult {
    const status = mapStatus(result.status);
    const message = decodeBase64(result.message);
    return {
      status,
      stdout: decodeBase64(result.stdout),
      stderr: decodeBase64(result.stderr),
      compileOutput: decodeBase64(result.compile_output),
      executionTimeMs: parseExecutionTimeMs(result.time),
      memoryUsageKiB: result.memory ?? undefined,
      diagnostic: message
        ? `Judge0 ${result.status.description}: ${message}`
        : `Judge0 ${result.status.description}`,
      compilerVersion: this.options.compilerVersion,
    };
  }
}
