import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { LessonLanguage } from "../generated/prisma/enums";

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(language: LessonLanguage = LessonLanguage.CPP) {
    const categories = await this.prisma.client.lessonCategory.findMany({
      where: { language, status: "PUBLISHED" },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        order: true,
        language: true,
        lessons: {
          where: { status: "PUBLISHED" },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            slug: true,
            title: true,
            summary: true,
            order: true,
          },
        },
      },
    });
    const items = categories.flatMap((category) =>
      category.lessons.map((lesson) => ({
        ...lesson,
        category: {
          id: category.id,
          slug: category.slug,
          title: category.title,
          order: category.order,
        },
      })),
    );
    return { categories, items, nextCursor: null };
  }

  async get(slug: string, language: LessonLanguage = LessonLanguage.CPP) {
    const lesson = await this.prisma.client.lesson.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        category: { language, status: "PUBLISHED" },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        body: true,
        order: true,
        category: {
          select: {
            id: true,
            slug: true,
            title: true,
            order: true,
            language: true,
          },
        },
        problems: {
          where: { problem: { status: "PUBLISHED" } },
          orderBy: { order: "asc" },
          select: {
            order: true,
            problem: {
              select: { id: true, number: true, title: true, difficulty: true },
            },
          },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException({
        code: "LESSON_NOT_FOUND",
        message: "강의를 찾을 수 없습니다.",
      });
    }
    return {
      ...lesson,
      problems: lesson.problems.map(
        ({
          problem,
          order,
        }: {
          problem: {
            id: string;
            number: number;
            title: string;
            difficulty: number;
          };
          order: number;
        }) => ({ ...problem, order }),
      ),
    };
  }
}
