import { createHash } from "node:crypto";
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { CreateRunDto, CreateSubmissionDto } from "./dto/execution.dto";

@Injectable()
export class ExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  async createRun(userId: string, dto: CreateRunDto) {
    await this.ensureCapacity(userId);
    const version = await this.requirePublishedVersion(dto.problemVersionId);
    const run = await this.prisma.transaction(async (tx) => {
      const created = await tx.run.create({
        data: {
          userId,
          problemId: version.problemId,
          problemVersionId: version.id,
          language: dto.language,
          sourceCode: dto.sourceCode,
          stdin: dto.stdin,
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: "run.requested",
          aggregateId: created.id,
          payload: { runId: created.id },
        },
      });
      return created;
    });
    return { runId: run.id, status: run.status };
  }

  async getRun(userId: string, id: string) {
    const run = await this.prisma.client.run.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        stdout: true,
        stderr: true,
        compileOutput: true,
        executionTimeMs: true,
        memoryUsageKiB: true,
        createdAt: true,
        finishedAt: true,
      },
    });
    if (!run) this.notFound("실행 기록을 찾을 수 없습니다.");
    return run;
  }

  async createSubmission(
    userId: string,
    idempotencyKey: string,
    dto: CreateSubmissionDto,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new ConflictException({
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "유효한 Idempotency-Key 헤더가 필요합니다.",
      });
    }
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          problemVersionId: dto.problemVersionId,
          language: dto.language,
          sourceCode: dto.sourceCode,
        }),
      )
      .digest("hex");
    const existing = await this.prisma.client.submission.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_CONFLICT",
          message: "같은 Idempotency-Key가 다른 요청에 사용되었습니다.",
        });
      }
      return { submissionId: existing.id, status: existing.status };
    }

    await this.ensureCapacity(userId);

    const version = await this.requirePublishedVersion(dto.problemVersionId);
    if (version.problem.currentVersionId !== version.id) {
      throw new ConflictException({
        code: "PROBLEM_VERSION_CONFLICT",
        message: "문제가 갱신되었습니다. 새 버전을 확인해 주세요.",
      });
    }
    const submission = await this.prisma.transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          userId,
          problemId: version.problemId,
          problemVersionId: version.id,
          idempotencyKey,
          requestHash,
          language: dto.language,
          sourceCode: dto.sourceCode,
          totalCount: version.testCases.length,
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: "submission.requested",
          aggregateId: created.id,
          payload: { submissionId: created.id },
        },
      });
      return created;
    });
    return { submissionId: submission.id, status: submission.status };
  }

  async getSubmission(userId: string, id: string, isAdmin: boolean) {
    const submission = await this.prisma.client.submission.findFirst({
      where: { id, ...(isAdmin ? {} : { userId }) },
      select: {
        id: true,
        problemId: true,
        problemVersionId: true,
        language: true,
        sourceCode: true,
        status: true,
        executionTimeMs: true,
        memoryUsageKiB: true,
        checkedCount: true,
        passedCount: true,
        totalCount: true,
        allowedDiagnostic: true,
        compilerVersion: true,
        createdAt: true,
        finishedAt: true,
        problem: { select: { number: true, title: true } },
        problemVersion: { select: { version: true } },
      },
    });
    if (!submission) this.notFound("제출 기록을 찾을 수 없습니다.");
    return submission;
  }

  async listSubmissions(userId: string, limit: number) {
    const items = await this.prisma.client.submission.findMany({
      where: { userId },
      take: Math.min(Math.max(limit || 20, 1), 100),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        language: true,
        executionTimeMs: true,
        memoryUsageKiB: true,
        checkedCount: true,
        passedCount: true,
        totalCount: true,
        createdAt: true,
        finishedAt: true,
        problem: { select: { number: true, title: true } },
      },
    });
    return { items, nextCursor: null };
  }

  private async requirePublishedVersion(id: string) {
    const version = await this.prisma.client.problemVersion.findFirst({
      where: {
        id,
        publishedAt: { not: null },
        problem: { status: "PUBLISHED" },
      },
      include: { problem: true, testCases: { select: { id: true } } },
    });
    if (!version) this.notFound("제출 가능한 문제 버전을 찾을 수 없습니다.");
    return version;
  }

  private async ensureCapacity(userId: string) {
    const activeStatuses = [
      "PENDING",
      "QUEUED",
      "COMPILING",
      "RUNNING",
    ] as const;
    const [runs, submissions] = await Promise.all([
      this.prisma.client.run.count({
        where: { userId, status: { in: [...activeStatuses] } },
      }),
      this.prisma.client.submission.count({
        where: { userId, status: { in: [...activeStatuses] } },
      }),
    ]);
    if (runs + submissions >= 2) {
      throw new HttpException(
        {
          code: "EXECUTION_CONCURRENCY_LIMIT",
          message: "동시에 처리할 수 있는 실행과 제출은 최대 2개입니다.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private notFound(message: string): never {
    throw new NotFoundException({
      code: "EXECUTION_RESOURCE_NOT_FOUND",
      message,
    });
  }
}
