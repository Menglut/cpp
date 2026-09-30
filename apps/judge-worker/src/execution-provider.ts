export type ProviderStatus =
  | "SUCCESS"
  | "CE"
  | "RE"
  | "TLE"
  | "MLE"
  | "OLE"
  | "SYSTEM_ERROR";

export type ExecutionLanguage = "C11" | "CPP17";

export type ProviderRequest = {
  language: ExecutionLanguage;
  sourceCode: string;
  stdin: string;
  expectedOutput?: string;
  timeLimitMs?: number;
  memoryLimitKiB?: number;
};

export type ProviderResult = {
  status: ProviderStatus;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  executionTimeMs?: number;
  memoryUsageKiB?: number;
  diagnostic: string;
  compilerVersion: string;
};

export interface ExecutionProvider {
  execute(request: ProviderRequest): Promise<ProviderResult>;
}
