import { compareOutput } from "@cppstudy/judge-domain";
import type { PrismaClient } from "./generated/prisma/client";
import type {
  ExecutionProvider,
  ProviderResult,
  ProviderStatus,
} from "./execution-provider";

const runFinal = new Set([
  "SUCCESS",
  "CE",
  "RE",
  "TLE",
  "MLE",
  "OLE",
  "SYSTEM_ERROR",
  "CANCELLED",
]);
const submissionFinal = new Set([
  "AC",
  "WA",
  "CE",
  "RE",
  "TLE",
  "MLE",
  "OLE",
  "SYSTEM_ERROR",
  "CANCELLED",
]);

export function createProcessors(
  prisma: PrismaClient,
  provider: ExecutionProvider,
) {
  return {
    run: async (runId: string) => {
      const run = await prisma.run.findUnique({
        where: { id: runId },
        include: {
          problemVersion: {
            include: {
              testCases: {
                where: { visibility: "EXAMPLE" },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });
      if (!run || runFinal.has(run.status)) return;
      try {
        await prisma.run.update({
          where: { id: run.id },
          data: { status: "RUNNING", attemptNo: { increment: 1 } },
        });
        const example = run.problemVersion.testCases.find(
          (test) => test.input === run.stdin,
        );
        const result = await provider.execute({
          sourceCode: run.sourceCode,
          stdin: run.stdin,
          expectedOutput: example?.expectedOutput,
          timeLimitMs: run.problemVersion.timeLimitMs,
          memoryLimitKiB: run.problemVersion.memoryLimitKiB,
        });
        await prisma.run.update({
          where: { id: run.id },
          data: {
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            compileOutput: result.compileOutput,
            executionTimeMs: result.executionTimeMs,
            memoryUsageKiB: result.memoryUsageKiB,
            finishedAt: new Date(),
          },
        });
      } catch {
        await prisma.run.update({
          where: { id: run.id },
          data: { status: "SYSTEM_ERROR", finishedAt: new Date() },
        });
        throw new Error(`Run ${run.id} failed in the judge worker`);
      }
    },

    submission: async (submissionId: string) => {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          problemVersion: {
            include: { testCases: { orderBy: { position: "asc" } } },
          },
        },
      });
      if (!submission || submissionFinal.has(submission.status)) return;

      let checkedCount = 0;
      let passedCount = 0;
      let executionTimeMs = 0;
      let memoryUsageKiB = 0;
      let finalStatus: "AC" | "WA" | Exclude<ProviderStatus, "SUCCESS"> = "AC";
      let diagnostic = "실행 대기 중";
      let compilerVersion: string | undefined;
      try {
        await prisma.submission.update({
          where: { id: submission.id },
          data: { status: "RUNNING", attemptNo: { increment: 1 } },
        });
        for (const test of submission.problemVersion.testCases) {
          const result = await provider.execute({
            sourceCode: submission.sourceCode,
            stdin: test.input,
            expectedOutput: test.expectedOutput,
            timeLimitMs: submission.problemVersion.timeLimitMs,
            memoryLimitKiB: submission.problemVersion.memoryLimitKiB,
          });
          diagnostic = allowedDiagnostic(result);
          compilerVersion = result.compilerVersion;
          checkedCount += 1;
          executionTimeMs += result.executionTimeMs ?? 0;
          memoryUsageKiB = Math.max(memoryUsageKiB, result.memoryUsageKiB ?? 0);
          if (result.status !== "SUCCESS") {
            finalStatus = result.status;
            break;
          }
          if (
            !compareOutput(result.stdout ?? "", test.expectedOutput, {
              comparator: submission.problemVersion.comparator,
              allowFinalNewline: submission.problemVersion.allowFinalNewline,
            })
          ) {
            finalStatus = "WA";
            diagnostic = "실행 결과가 예상 출력과 일치하지 않습니다.";
            break;
          }
          passedCount += 1;
          await prisma.submission.update({
            where: { id: submission.id },
            data: { checkedCount, passedCount },
          });
        }
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: finalStatus,
            checkedCount,
            passedCount,
            executionTimeMs,
            memoryUsageKiB,
            allowedDiagnostic: diagnostic,
            compilerVersion,
            finishedAt: new Date(),
          },
        });
      } catch {
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: "SYSTEM_ERROR",
            allowedDiagnostic: "코드 실행 서비스 처리 중 오류가 발생했습니다.",
            finishedAt: new Date(),
          },
        });
        throw new Error(
          `Submission ${submission.id} failed in the judge worker`,
        );
      }
    },

    validation: async (validationId: string) => {
      const validation = await prisma.problemValidation.findUnique({
        where: { id: validationId },
        include: {
          problemVersion: {
            include: { testCases: { orderBy: { position: "asc" } } },
          },
        },
      });
      if (!validation || ["PASSED", "FAILED"].includes(validation.status))
        return;
      const version = validation.problemVersion;
      if (!version.referenceSource) {
        await prisma.problemValidation.update({
          where: { id: validation.id },
          data: {
            status: "FAILED",
            diagnostic: "기준 코드가 없습니다.",
            finishedAt: new Date(),
          },
        });
        return;
      }
      try {
        await prisma.problemValidation.update({
          where: { id: validation.id },
          data: { status: "RUNNING", startedAt: new Date(), diagnostic: null },
        });
        for (const test of version.testCases) {
          const result = await provider.execute({
            sourceCode: version.referenceSource,
            stdin: test.input,
            expectedOutput: test.expectedOutput,
            timeLimitMs: version.timeLimitMs,
            memoryLimitKiB: version.memoryLimitKiB,
          });
          if (result.status !== "SUCCESS") {
            await finishValidation(
              prisma,
              validation.id,
              "FAILED",
              allowedDiagnostic(result),
            );
            return;
          }
          if (
            !compareOutput(result.stdout ?? "", test.expectedOutput, {
              comparator: version.comparator,
              allowFinalNewline: version.allowFinalNewline,
            })
          ) {
            await finishValidation(
              prisma,
              validation.id,
              "FAILED",
              `테스트 ${test.position}의 출력이 기대 출력과 일치하지 않습니다.`,
            );
            return;
          }
        }
        await prisma.$transaction([
          prisma.problemVersion.update({
            where: { id: version.id },
            data: { validatedAt: new Date() },
          }),
          prisma.problemValidation.update({
            where: { id: validation.id },
            data: {
              status: "PASSED",
              diagnostic: "모든 테스트를 통과했습니다.",
              finishedAt: new Date(),
            },
          }),
        ]);
      } catch {
        await finishValidation(
          prisma,
          validation.id,
          "SYSTEM_ERROR",
          "검증 실행 서비스 처리 중 오류가 발생했습니다.",
        );
        throw new Error(
          `Problem validation ${validation.id} failed in the judge worker`,
        );
      }
    },
  };
}

function finishValidation(
  prisma: PrismaClient,
  validationId: string,
  status: "FAILED" | "SYSTEM_ERROR",
  diagnostic: string,
) {
  return prisma.problemValidation.update({
    where: { id: validationId },
    data: {
      status,
      diagnostic: diagnostic.slice(0, 8000),
      finishedAt: new Date(),
    },
  });
}

function allowedDiagnostic(result: ProviderResult): string {
  const detail = result.compileOutput ?? result.stderr;
  return [result.diagnostic, detail]
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .slice(0, 8000);
}
