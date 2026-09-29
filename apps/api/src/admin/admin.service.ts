import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { AuthenticatedUser } from "../common/request-context";
import type {
  CreateLessonDto,
  CreateProblemDto,
  LinkLessonProblemsDto,
  SaveTestCasesDto,
  UpdateLessonDto,
  UpdateProblemDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  createLesson(dto: CreateLessonDto, actor: AuthenticatedUser) {
    return this.prisma.transaction(async (tx) => {
      const lesson = await tx.lesson.create({ data: dto });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "LESSON_CREATE", targetType: "Lesson", targetId: lesson.id },
      });
      return lesson;
    });
  }

  async updateLesson(id: string, dto: UpdateLessonDto, actor: AuthenticatedUser) {
    await this.requireLesson(id);
    return this.prisma.transaction(async (tx) => {
      const lesson = await tx.lesson.update({ where: { id }, data: dto });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "LESSON_UPDATE", targetType: "Lesson", targetId: id },
      });
      return lesson;
    });
  }

  async archiveLesson(id: string, actor: AuthenticatedUser) {
    await this.requireLesson(id);
    return this.prisma.transaction(async (tx) => {
      const lesson = await tx.lesson.update({ where: { id }, data: { status: "ARCHIVED" } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "LESSON_ARCHIVE", targetType: "Lesson", targetId: id },
      });
      return lesson;
    });
  }

  async linkLessonProblems(id: string, dto: LinkLessonProblemsDto, actor: AuthenticatedUser) {
    await this.requireLesson(id);
    return this.prisma.transaction(async (tx) => {
      await tx.lessonProblem.deleteMany({ where: { lessonId: id } });
      if (dto.problems.length) {
        await tx.lessonProblem.createMany({
          data: dto.problems.map((item) => ({ lessonId: id, ...item })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_PROBLEMS_SET",
          targetType: "Lesson",
          targetId: id,
          metadata: { count: dto.problems.length },
        },
      });
      return { success: true };
    });
  }

  createProblem(dto: CreateProblemDto, actor: AuthenticatedUser) {
    const { number, title, difficulty, ...versionData } = dto;
    return this.prisma.transaction(async (tx) => {
      const problem = await tx.problem.create({ data: { number, title, difficulty } });
      const version = await tx.problemVersion.create({
        data: { problemId: problem.id, version: 1, ...versionData },
      });
      await tx.problem.update({ where: { id: problem.id }, data: { currentVersionId: version.id } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "PROBLEM_CREATE", targetType: "Problem", targetId: problem.id },
      });
      return { ...problem, currentVersion: version };
    });
  }

  async updateProblem(id: string, dto: UpdateProblemDto, actor: AuthenticatedUser) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { id },
      include: { currentVersion: true },
    });
    if (!problem?.currentVersion) this.notFound("문제를 찾을 수 없습니다.");
    if (problem.status === "PUBLISHED") {
      throw new ConflictException({
        code: "PUBLISHED_VERSION_IMMUTABLE",
        message: "공개 문제는 새 버전을 만들어 수정해야 합니다.",
      });
    }
    const { title, difficulty, ...versionData } = dto;
    return this.prisma.transaction(async (tx) => {
      if (title !== undefined || difficulty !== undefined) {
        await tx.problem.update({ where: { id }, data: { title, difficulty } });
      }
      const version = await tx.problemVersion.update({
        where: { id: problem.currentVersion!.id },
        data: versionData,
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "PROBLEM_UPDATE", targetType: "Problem", targetId: id },
      });
      return version;
    });
  }

  async saveTestCases(versionId: string, dto: SaveTestCasesDto, actor: AuthenticatedUser) {
    const version = await this.prisma.client.problemVersion.findUnique({
      where: { id: versionId },
      include: { problem: true },
    });
    if (!version) this.notFound("문제 버전을 찾을 수 없습니다.");
    if (version.publishedAt) {
      throw new ConflictException({
        code: "PUBLISHED_VERSION_IMMUTABLE",
        message: "공개된 문제 버전의 테스트는 수정할 수 없습니다.",
      });
    }
    return this.prisma.transaction(async (tx) => {
      await tx.testCase.deleteMany({ where: { problemVersionId: versionId } });
      if (dto.testCases.length) {
        await tx.testCase.createMany({
          data: dto.testCases.map((testCase) => ({ problemVersionId: versionId, ...testCase })),
        });
      }
      await tx.problemVersion.update({ where: { id: versionId }, data: { validatedAt: null } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_TESTS_SET",
          targetType: "ProblemVersion",
          targetId: versionId,
          metadata: { count: dto.testCases.length },
        },
      });
      return { success: true };
    });
  }

  async requestValidation(versionId: string, actor: AuthenticatedUser) {
    const version = await this.prisma.client.problemVersion.findUnique({
      where: { id: versionId },
      include: { testCases: true },
    });
    if (!version) this.notFound("문제 버전을 찾을 수 없습니다.");
    const examples = version.testCases.filter(
      (test: { visibility: string }) => test.visibility === "EXAMPLE",
    ).length;
    const hidden = version.testCases.filter(
      (test: { visibility: string }) => test.visibility === "HIDDEN",
    ).length;
    if (!version.referenceSource || examples < 1 || hidden < 3) {
      throw new ConflictException({
        code: "VALIDATION_REQUIREMENTS_NOT_MET",
        message: "기준 코드, 공개 예제 1개, 숨김 테스트 3개 이상이 필요합니다.",
      });
    }
    return this.prisma.transaction(async (tx) => {
      const event = await tx.outboxEvent.create({
        data: {
          topic: "problem-version.validate",
          aggregateId: versionId,
          payload: { problemVersionId: versionId },
        },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "PROBLEM_VALIDATE", targetType: "ProblemVersion", targetId: versionId },
      });
      return { validationId: event.id, status: "PENDING" };
    });
  }

  async publish(versionId: string, actor: AuthenticatedUser) {
    const version = await this.prisma.client.problemVersion.findUnique({ where: { id: versionId } });
    if (!version) this.notFound("문제 버전을 찾을 수 없습니다.");
    if (!version.validatedAt) {
      throw new ConflictException({
        code: "VALIDATION_REQUIRED",
        message: "기준 코드 검증을 통과한 버전만 공개할 수 있습니다.",
      });
    }
    return this.prisma.transaction(async (tx) => {
      const now = new Date();
      await tx.problemVersion.update({ where: { id: versionId }, data: { publishedAt: now } });
      const problem = await tx.problem.update({
        where: { id: version.problemId },
        data: { status: "PUBLISHED", currentVersionId: versionId },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "PROBLEM_PUBLISH", targetType: "ProblemVersion", targetId: versionId },
      });
      return problem;
    });
  }

  async archiveProblem(id: string, actor: AuthenticatedUser) {
    const problem = await this.prisma.client.problem.findUnique({ where: { id } });
    if (!problem) this.notFound("문제를 찾을 수 없습니다.");
    return this.prisma.transaction(async (tx) => {
      const archived = await tx.problem.update({ where: { id }, data: { status: "ARCHIVED" } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "PROBLEM_ARCHIVE", targetType: "Problem", targetId: id },
      });
      return archived;
    });
  }

  private async requireLesson(id: string): Promise<void> {
    if (!(await this.prisma.client.lesson.findUnique({ where: { id }, select: { id: true } }))) {
      this.notFound("강의를 찾을 수 없습니다.");
    }
  }

  private notFound(message: string): never {
    throw new NotFoundException({ code: "ADMIN_RESOURCE_NOT_FOUND", message });
  }
}
