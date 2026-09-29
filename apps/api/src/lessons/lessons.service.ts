import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.client.lesson.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, title: true, summary: true, order: true },
    });
    return { items, nextCursor: null };
  }

  async get(slug: string) {
    const lesson = await this.prisma.client.lesson.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        body: true,
        order: true,
        problems: {
          where: { problem: { status: "PUBLISHED" } },
          orderBy: { order: "asc" },
          select: {
            order: true,
            problem: { select: { id: true, number: true, title: true, difficulty: true } },
          },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException({ code: "LESSON_NOT_FOUND", message: "강의를 찾을 수 없습니다." });
    }
    return {
      ...lesson,
      problems: lesson.problems.map(
        ({ problem, order }: {
          problem: { id: string; number: number; title: string; difficulty: number };
          order: number;
        }) => ({ ...problem, order }),
      ),
    };
  }
}
