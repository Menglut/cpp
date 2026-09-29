import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../common/request-context";
import { PrismaService } from "../database/prisma.service";
import type {
  CreateLessonDto,
  CreateLessonCategoryDto,
  CreateInvitationDto,
  CreateProblemDto,
  LinkLessonProblemsDto,
  SaveTestCasesDto,
  SetProblemRelationsDto,
  UpdateLessonDto,
  UpdateLessonCategoryDto,
  UpdateProblemDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvitations() {
    const items = await this.prisma.client.invitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
        invitedBy: { select: { nickname: true, email: true } },
      },
    });
    return { items };
  }

  async createInvitation(dto: CreateInvitationDto, actor: AuthenticatedUser) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.client.user.findUnique({ where: { email } })) {
      throw new ConflictException({
        code: "EMAIL_ALREADY_REGISTERED",
        message: "이미 가입된 이메일입니다.",
      });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: {
          email,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      const created = await tx.invitation.create({
        data: { email, tokenHash, expiresAt, invitedById: actor.id },
        select: { id: true, email: true, expiresAt: true, createdAt: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "INVITATION_CREATE",
          targetType: "Invitation",
          targetId: created.id,
          metadata: { email, expiresAt: expiresAt.toISOString() },
        },
      });
      return created;
    });
    return { ...invitation, token };
  }

  async revokeInvitation(id: string, actor: AuthenticatedUser) {
    const invitation = await this.prisma.client.invitation.findUnique({
      where: { id },
    });
    if (!invitation) this.notFound("초대를 찾을 수 없습니다.");
    if (invitation.acceptedAt) {
      throw new ConflictException({
        code: "INVITATION_ALREADY_ACCEPTED",
        message: "이미 사용된 초대는 취소할 수 없습니다.",
      });
    }
    if (invitation.revokedAt)
      return { ...invitation, revokedAt: invitation.revokedAt };

    return this.prisma.transaction(async (tx) => {
      const revokedAt = new Date();
      const revoked = await tx.invitation.update({
        where: { id },
        data: { revokedAt },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "INVITATION_REVOKE",
          targetType: "Invitation",
          targetId: id,
          metadata: { email: invitation.email },
        },
      });
      return revoked;
    });
  }

  async listContent() {
    const [lessons, problems, categories, lessonCategories] = await Promise.all(
      [
        this.prisma.client.lesson.findMany({
          orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            categoryId: true,
            slug: true,
            title: true,
            status: true,
            order: true,
            updatedAt: true,
            versions: {
              where: { publishedAt: null },
              orderBy: { version: "desc" },
              take: 1,
              select: { id: true, version: true, title: true },
            },
          },
        }),
        this.prisma.client.problem.findMany({
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            title: true,
            difficulty: true,
            status: true,
            updatedAt: true,
            currentVersionId: true,
            versions: {
              where: { publishedAt: null },
              orderBy: { version: "desc" },
              take: 1,
              select: { id: true, version: true },
            },
          },
        }),
        this.prisma.client.category.findMany({ orderBy: { name: "asc" } }),
        this.prisma.client.lessonCategory.findMany({
          orderBy: [{ order: "asc" }, { title: "asc" }],
          include: { _count: { select: { lessons: true } } },
        }),
      ],
    );
    return {
      lessons: lessons.map(({ versions, ...lesson }) => ({
        ...lesson,
        title: versions[0]?.title ?? lesson.title,
        editableVersionId: versions[0]?.id ?? null,
        editableVersion: versions[0]?.version ?? null,
      })),
      problems: problems.map(({ versions, ...problem }) => ({
        ...problem,
        editableVersionId: versions[0]?.id ?? null,
        editableVersion: versions[0]?.version ?? null,
      })),
      categories,
      lessonCategories,
    };
  }

  async getLesson(id: string) {
    const lesson = await this.prisma.client.lesson.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: {
          where: { publishedAt: null },
          orderBy: { version: "desc" },
          take: 1,
        },
        problems: {
          orderBy: { order: "asc" },
          select: { problemId: true, order: true },
        },
      },
    });
    if (!lesson) this.notFound("강의를 찾을 수 없습니다.");
    const editableVersion = lesson.versions[0] ?? lesson.currentVersion;
    return {
      id: lesson.id,
      categoryId: lesson.categoryId,
      slug: lesson.slug,
      order: lesson.order,
      status: lesson.status,
      publishedAt: lesson.publishedAt,
      currentVersionId: lesson.currentVersionId,
      editable: Boolean(editableVersion && !editableVersion.publishedAt),
      editableVersion,
      title: editableVersion?.title ?? lesson.title,
      summary: editableVersion?.summary ?? lesson.summary,
      body: editableVersion?.body ?? lesson.body,
      problems: lesson.problems,
    };
  }

  async getProblem(id: string) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { id },
      include: {
        currentVersion: {
          include: { testCases: { orderBy: { position: "asc" } } },
        },
        versions: {
          where: { publishedAt: null },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            testCases: { orderBy: { position: "asc" } },
            validations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        categories: { select: { categoryId: true } },
        lessons: {
          orderBy: { order: "asc" },
          select: { lessonId: true, order: true },
        },
      },
    });
    if (!problem) this.notFound("문제를 찾을 수 없습니다.");
    const editableVersion = problem.versions[0] ?? problem.currentVersion;
    return {
      id: problem.id,
      number: problem.number,
      title: editableVersion?.title ?? problem.title,
      difficulty: editableVersion?.difficulty ?? problem.difficulty,
      status: problem.status,
      currentVersionId: problem.currentVersionId,
      editable: Boolean(editableVersion && !editableVersion.publishedAt),
      editableVersion,
      categoryIds: problem.categories.map((item) => item.categoryId),
      lessonIds: problem.lessons.map((item) => item.lessonId),
    };
  }

  async getValidation(id: string) {
    const validation = await this.prisma.client.problemValidation.findUnique({
      where: { id },
    });
    if (!validation) this.notFound("검증 작업을 찾을 수 없습니다.");
    return validation;
  }

  async createLesson(dto: CreateLessonDto, actor: AuthenticatedUser) {
    await this.requireLessonCategory(dto.categoryId);
    return this.prisma.transaction(async (tx) => {
      const { title, summary, body, ...lessonData } = dto;
      const lesson = await tx.lesson.create({
        data: { ...lessonData, title, summary, body },
      });
      const version = await tx.lessonVersion.create({
        data: { lessonId: lesson.id, version: 1, title, summary, body },
      });
      await tx.lesson.update({
        where: { id: lesson.id },
        data: { currentVersionId: version.id },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_CREATE",
          targetType: "Lesson",
          targetId: lesson.id,
        },
      });
      return {
        ...lesson,
        currentVersionId: version.id,
        editableVersion: version,
      };
    });
  }

  async updateLesson(
    id: string,
    dto: UpdateLessonDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.categoryId) await this.requireLessonCategory(dto.categoryId);
    const lesson = await this.prisma.client.lesson.findUnique({
      where: { id },
      include: {
        versions: {
          where: { publishedAt: null },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!lesson) this.notFound("강의를 찾을 수 없습니다.");
    const version = lesson.versions[0];
    if (!version) {
      throw new ConflictException({
        code: "PUBLISHED_VERSION_IMMUTABLE",
        message: "공개 강의는 새 버전을 만들어 수정해야 합니다.",
      });
    }
    return this.prisma.transaction(async (tx) => {
      const { order, categoryId, ...versionData } = dto;
      const updated = await tx.lessonVersion.update({
        where: { id: version.id },
        data: versionData,
      });
      const savedLesson =
        order === undefined && categoryId === undefined
          ? lesson
          : await tx.lesson.update({
              where: { id },
              data: { order, categoryId },
            });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_UPDATE",
          targetType: "Lesson",
          targetId: id,
        },
      });
      return {
        ...savedLesson,
        title: updated.title,
        summary: updated.summary,
        body: updated.body,
        editableVersion: updated,
      };
    });
  }

  createLessonCategory(dto: CreateLessonCategoryDto, actor: AuthenticatedUser) {
    return this.prisma.transaction(async (tx) => {
      const category = await tx.lessonCategory.create({ data: dto });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_CATEGORY_CREATE",
          targetType: "LessonCategory",
          targetId: category.id,
        },
      });
      return category;
    });
  }

  async updateLessonCategory(
    id: string,
    dto: UpdateLessonCategoryDto,
    actor: AuthenticatedUser,
  ) {
    await this.requireLessonCategory(id);
    return this.prisma.transaction(async (tx) => {
      const current = await tx.lessonCategory.findUniqueOrThrow({
        where: { id },
      });
      if (
        dto.slug &&
        (await tx.lessonCategory.findFirst({
          where: { slug: dto.slug, id: { not: id } },
          select: { id: true },
        }))
      ) {
        throw new ConflictException({
          code: "LESSON_CATEGORY_SLUG_ALREADY_EXISTS",
          message: "이미 사용 중인 카테고리 Slug입니다.",
        });
      }
      const category = await tx.lessonCategory.update({
        where: { id },
        data: dto,
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_CATEGORY_UPDATE",
          targetType: "LessonCategory",
          targetId: id,
          metadata: {
            previousSlug: current.slug,
            slug: category.slug,
            previousTitle: current.title,
            title: category.title,
          },
        },
      });
      return category;
    });
  }

  async changeLessonCategoryStatus(
    id: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    actor: AuthenticatedUser,
  ) {
    await this.requireLessonCategory(id);
    return this.prisma.transaction(async (tx) => {
      const category = await tx.lessonCategory.update({
        where: { id },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: `LESSON_CATEGORY_${status}`,
          targetType: "LessonCategory",
          targetId: id,
        },
      });
      return category;
    });
  }

  async createLessonVersion(id: string, actor: AuthenticatedUser) {
    const lesson = await this.prisma.client.lesson.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: { where: { publishedAt: null }, take: 1 },
      },
    });
    if (!lesson?.currentVersion) this.notFound("강의를 찾을 수 없습니다.");
    if (lesson.versions.length)
      throw new ConflictException({
        code: "DRAFT_VERSION_EXISTS",
        message: "이미 편집 중인 강의 초안 버전이 있습니다.",
      });
    const source = lesson.currentVersion;
    return this.prisma.transaction(async (tx) => {
      const latest = await tx.lessonVersion.aggregate({
        where: { lessonId: id },
        _max: { version: true },
      });
      const version = await tx.lessonVersion.create({
        data: {
          lessonId: id,
          version: (latest._max.version ?? 0) + 1,
          title: source.title,
          summary: source.summary,
          body: source.body,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_VERSION_CREATE",
          targetType: "LessonVersion",
          targetId: version.id,
        },
      });
      return version;
    });
  }

  async archiveLesson(id: string, actor: AuthenticatedUser) {
    await this.requireLesson(id);
    return this.changeLessonStatus(id, "ARCHIVED", "LESSON_ARCHIVE", actor);
  }

  async publishLesson(id: string, actor: AuthenticatedUser) {
    const source = await this.prisma.client.lesson.findUnique({
      where: { id },
      include: {
        versions: {
          where: { publishedAt: null },
          orderBy: { version: "desc" },
          take: 1,
        },
        currentVersion: true,
      },
    });
    if (!source) this.notFound("강의를 찾을 수 없습니다.");
    const version = source.versions[0] ?? source.currentVersion;
    if (!version) this.notFound("공개할 강의 버전이 없습니다.");
    const publishedAt = new Date();
    return this.prisma.transaction(async (tx) => {
      const lesson = await tx.lesson.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt,
          currentVersionId: version.id,
          title: version.title,
          summary: version.summary,
          body: version.body,
        },
      });
      await tx.lessonVersion.update({
        where: { id: version.id },
        data: { publishedAt },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "LESSON_PUBLISH",
          targetType: "Lesson",
          targetId: id,
        },
      });
      return lesson;
    });
  }

  async restoreLesson(id: string, actor: AuthenticatedUser) {
    const lesson = await this.prisma.client.lesson.findUnique({
      where: { id },
    });
    if (!lesson) this.notFound("강의를 찾을 수 없습니다.");
    return this.changeLessonStatus(
      id,
      lesson.publishedAt ? "PUBLISHED" : "DRAFT",
      "LESSON_RESTORE",
      actor,
    );
  }

  async linkLessonProblems(
    id: string,
    dto: LinkLessonProblemsDto,
    actor: AuthenticatedUser,
  ) {
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
      const problem = await tx.problem.create({
        data: { number, title, difficulty },
      });
      const version = await tx.problemVersion.create({
        data: {
          problemId: problem.id,
          version: 1,
          title,
          difficulty,
          ...versionData,
        },
      });
      await tx.problem.update({
        where: { id: problem.id },
        data: { currentVersionId: version.id },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_CREATE",
          targetType: "Problem",
          targetId: problem.id,
        },
      });
      return { ...problem, currentVersion: version };
    });
  }

  async updateProblem(
    id: string,
    dto: UpdateProblemDto,
    actor: AuthenticatedUser,
  ) {
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
    return this.updateProblemVersion(problem.currentVersion.id, dto, actor);
  }

  async createProblemVersion(id: string, actor: AuthenticatedUser) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { id },
      include: {
        currentVersion: {
          include: { testCases: { orderBy: { position: "asc" } } },
        },
        versions: {
          where: { publishedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!problem?.currentVersion) this.notFound("문제를 찾을 수 없습니다.");
    if (problem.versions.length) {
      throw new ConflictException({
        code: "DRAFT_VERSION_EXISTS",
        message: "이미 편집 중인 초안 버전이 있습니다.",
      });
    }
    const source = problem.currentVersion;
    return this.prisma.transaction(async (tx) => {
      const latest = await tx.problemVersion.aggregate({
        where: { problemId: id },
        _max: { version: true },
      });
      const version = await tx.problemVersion.create({
        data: {
          problemId: id,
          version: (latest._max.version ?? 0) + 1,
          title: source.title,
          difficulty: source.difficulty,
          statement: source.statement,
          inputDescription: source.inputDescription,
          outputDescription: source.outputDescription,
          constraints: source.constraints,
          comparator: source.comparator,
          allowFinalNewline: source.allowFinalNewline,
          timeLimitMs: source.timeLimitMs,
          memoryLimitKiB: source.memoryLimitKiB,
          starterCode: source.starterCode,
          referenceSource: source.referenceSource,
          testCases: {
            create: source.testCases.map(
              ({
                position,
                visibility,
                input,
                expectedOutput,
                explanation,
              }) => ({
                position,
                visibility,
                input,
                expectedOutput,
                explanation,
              }),
            ),
          },
        },
        include: { testCases: { orderBy: { position: "asc" } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_VERSION_CREATE",
          targetType: "ProblemVersion",
          targetId: version.id,
        },
      });
      return version;
    });
  }

  async updateProblemVersion(
    versionId: string,
    dto: UpdateProblemDto,
    actor: AuthenticatedUser,
  ) {
    const version = await this.prisma.client.problemVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) this.notFound("문제 버전을 찾을 수 없습니다.");
    if (version.publishedAt) {
      throw new ConflictException({
        code: "PUBLISHED_VERSION_IMMUTABLE",
        message: "공개된 문제 버전은 수정할 수 없습니다.",
      });
    }
    const { title, difficulty, ...versionData } = dto;
    return this.prisma.transaction(async (tx) => {
      const updated = await tx.problemVersion.update({
        where: { id: versionId },
        data: { ...versionData, title, difficulty, validatedAt: null },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_UPDATE",
          targetType: "ProblemVersion",
          targetId: versionId,
        },
      });
      return updated;
    });
  }

  async setProblemRelations(
    id: string,
    dto: SetProblemRelationsDto,
    actor: AuthenticatedUser,
  ) {
    await this.requireProblem(id);
    return this.prisma.transaction(async (tx) => {
      await tx.problemCategory.deleteMany({ where: { problemId: id } });
      await tx.lessonProblem.deleteMany({ where: { problemId: id } });
      if (dto.categoryIds.length) {
        await tx.problemCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            problemId: id,
            categoryId,
          })),
        });
      }
      if (dto.lessonIds.length) {
        await tx.lessonProblem.createMany({
          data: dto.lessonIds.map((lessonId, order) => ({
            problemId: id,
            lessonId,
            order,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_RELATIONS_SET",
          targetType: "Problem",
          targetId: id,
          metadata: {
            categories: dto.categoryIds.length,
            lessons: dto.lessonIds.length,
          },
        },
      });
      return { success: true };
    });
  }

  async saveTestCases(
    versionId: string,
    dto: SaveTestCasesDto,
    actor: AuthenticatedUser,
  ) {
    const version = await this.prisma.client.problemVersion.findUnique({
      where: { id: versionId },
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
          data: dto.testCases.map((testCase) => ({
            problemVersionId: versionId,
            ...testCase,
          })),
        });
      }
      await tx.problemVersion.update({
        where: { id: versionId },
        data: { validatedAt: null },
      });
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
    if (version.publishedAt) {
      throw new ConflictException({
        code: "PUBLISHED_VERSION_IMMUTABLE",
        message: "공개된 문제 버전은 다시 검증할 수 없습니다.",
      });
    }
    const examples = version.testCases.filter(
      (test) => test.visibility === "EXAMPLE",
    ).length;
    const hidden = version.testCases.filter(
      (test) => test.visibility === "HIDDEN",
    ).length;
    if (!version.referenceSource || examples < 1 || hidden < 3) {
      throw new ConflictException({
        code: "VALIDATION_REQUIREMENTS_NOT_MET",
        message: "기준 코드, 공개 예제 1개, 숨김 테스트 3개 이상이 필요합니다.",
      });
    }
    return this.prisma.transaction(async (tx) => {
      const validation = await tx.problemValidation.create({
        data: { problemVersionId: versionId, requestedById: actor.id },
      });
      await tx.outboxEvent.create({
        data: {
          topic: "problem-version.validate",
          aggregateId: validation.id,
          payload: { validationId: validation.id, problemVersionId: versionId },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_VALIDATE",
          targetType: "ProblemVersion",
          targetId: versionId,
        },
      });
      return { validationId: validation.id, status: validation.status };
    });
  }

  async publish(versionId: string, actor: AuthenticatedUser) {
    const version = await this.prisma.client.problemVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) this.notFound("문제 버전을 찾을 수 없습니다.");
    if (!version.validatedAt) {
      throw new ConflictException({
        code: "VALIDATION_REQUIRED",
        message: "기준 코드 검증을 통과한 버전만 공개할 수 있습니다.",
      });
    }
    return this.prisma.transaction(async (tx) => {
      const now = new Date();
      await tx.problemVersion.update({
        where: { id: versionId },
        data: { publishedAt: now },
      });
      const problem = await tx.problem.update({
        where: { id: version.problemId },
        data: {
          status: "PUBLISHED",
          currentVersionId: versionId,
          title: version.title,
          difficulty: version.difficulty,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROBLEM_PUBLISH",
          targetType: "ProblemVersion",
          targetId: versionId,
        },
      });
      return problem;
    });
  }

  async archiveProblem(id: string, actor: AuthenticatedUser) {
    await this.requireProblem(id);
    return this.changeProblemStatus(id, "ARCHIVED", "PROBLEM_ARCHIVE", actor);
  }

  async restoreProblem(id: string, actor: AuthenticatedUser) {
    const problem = await this.prisma.client.problem.findUnique({
      where: { id },
      include: { currentVersion: true },
    });
    if (!problem) this.notFound("문제를 찾을 수 없습니다.");
    return this.changeProblemStatus(
      id,
      problem.currentVersion?.publishedAt ? "PUBLISHED" : "DRAFT",
      "PROBLEM_RESTORE",
      actor,
    );
  }

  private changeLessonStatus(
    id: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    action: string,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.transaction(async (tx) => {
      const lesson = await tx.lesson.update({
        where: { id },
        data: { status },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, action, targetType: "Lesson", targetId: id },
      });
      return lesson;
    });
  }

  private changeProblemStatus(
    id: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    action: string,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.transaction(async (tx) => {
      const problem = await tx.problem.update({
        where: { id },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action,
          targetType: "Problem",
          targetId: id,
        },
      });
      return problem;
    });
  }

  private async requireLesson(id: string): Promise<void> {
    if (
      !(await this.prisma.client.lesson.findUnique({
        where: { id },
        select: { id: true },
      }))
    ) {
      this.notFound("강의를 찾을 수 없습니다.");
    }
  }

  private async requireProblem(id: string): Promise<void> {
    if (
      !(await this.prisma.client.problem.findUnique({
        where: { id },
        select: { id: true },
      }))
    ) {
      this.notFound("문제를 찾을 수 없습니다.");
    }
  }

  private async requireLessonCategory(id: string): Promise<void> {
    if (
      !(await this.prisma.client.lessonCategory.findUnique({
        where: { id },
        select: { id: true },
      }))
    ) {
      this.notFound("학습 카테고리를 찾을 수 없습니다.");
    }
  }

  private notFound(message: string): never {
    throw new NotFoundException({ code: "ADMIN_RESOURCE_NOT_FOUND", message });
  }
}
