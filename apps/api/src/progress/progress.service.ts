import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const [completed, solved, submissionCount] = await Promise.all([
      this.prisma.client.lessonProgress.findMany({
        where: { userId },
        orderBy: { completedAt: "asc" },
        select: { lesson: { select: { slug: true } } },
      }),
      this.prisma.client.submission.findMany({
        where: { userId, status: "AC" },
        distinct: ["problemId"],
        select: { problem: { select: { number: true } } },
      }),
      this.prisma.client.submission.count({ where: { userId } }),
    ]);

    return {
      completedLessonSlugs: completed.map((item) => item.lesson.slug),
      solvedProblemNumbers: solved.map((item) => item.problem.number),
      submissionCount,
    };
  }

  async setLessonCompletion(userId: string, slug: string, completed: boolean) {
    const lesson = await this.prisma.client.lesson.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!lesson) {
      throw new NotFoundException({
        code: "LESSON_NOT_FOUND",
        message: "강의를 찾을 수 없습니다.",
      });
    }

    if (completed) {
      await this.prisma.client.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        update: { completedAt: new Date() },
        create: { userId, lessonId: lesson.id },
      });
    } else {
      await this.prisma.client.lessonProgress.deleteMany({
        where: { userId, lessonId: lesson.id },
      });
    }
    return { slug, completed };
  }
}
