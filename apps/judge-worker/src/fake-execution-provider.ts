import type {
  ExecutionProvider,
  ProviderRequest,
  ProviderResult,
  ProviderStatus,
} from "./execution-provider";

const markerStatuses: Array<[string, Exclude<ProviderStatus, "SUCCESS">]> = [
  ["FAKE:CE", "CE"],
  ["FAKE:RE", "RE"],
  ["FAKE:TLE", "TLE"],
  ["FAKE:MLE", "MLE"],
  ["FAKE:OLE", "OLE"],
  ["FAKE:SYSTEM_ERROR", "SYSTEM_ERROR"],
];

export class FakeExecutionProvider implements ExecutionProvider {
  async execute(request: ProviderRequest): Promise<ProviderResult> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const marked = markerStatuses.find(([marker]) =>
      request.sourceCode.includes(marker),
    );
    if (marked) {
      const status = marked[1];
      return {
        status,
        compileOutput:
          status === "CE"
            ? "개발용 Fake Provider가 생성한 컴파일 오류 시나리오입니다."
            : undefined,
        stderr:
          status === "RE"
            ? "개발용 Fake Provider가 생성한 실행 오류 시나리오입니다."
            : undefined,
        diagnostic: `FAKE_PROVIDER:${status}`,
        compilerVersion: "cppstudy-fake-provider/1",
      };
    }

    const wrongAnswer = request.sourceCode.includes("FAKE:WA");
    return {
      status: "SUCCESS",
      stdout: wrongAnswer
        ? "__CPPSTUDY_FAKE_WRONG_OUTPUT__"
        : (request.expectedOutput ??
          `[개발용 Fake Provider]\n입력 ${request.stdin.length}바이트를 받았습니다.`),
      stderr: "",
      executionTimeMs: 5,
      memoryUsageKiB: 1024,
      diagnostic: wrongAnswer ? "FAKE_PROVIDER:WA" : "FAKE_PROVIDER:SUCCESS",
      compilerVersion: "cppstudy-fake-provider/1",
    };
  }
}
