import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { ProblemQueryDto } from "./dto/problem-query.dto";

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProblemQueryDto) {
    const q = query.q?.trim();
    const numericQuery = q && /^\d+$/.test(q) ? Number(q) : undefined;
    const items = await this.prisma.client.problem.findMany({
      where: {
        status: "PUBLISHED",
        difficulty: query.difficulty,
        categories: query.category
          ? { some: { category: { slug: query.category } } }
          : undefined,
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              ...(numericQuery ? [{ number: numericQuery }] : []),
            ]
          : undefined,
      },
      take: query.limit,
      orderBy: query.sort === "title" ? { title: "asc" } : { number: "asc" },
      select: {
        id: true,
        number: true,
        title: true,
        difficulty: true,
        categories: { select: { category: { select: { slug: true, name: true } } } },
      },
    });
    return {
      items: items.map((item: {
        id: string;
        number: number;
        title: string;
        difficulty: number;
        categories: Array<{ category: { slug: string; name: string } }>;
      }) => ({
        ...item,
        categories: item.categories.map(
          ({ category }: { category: { slug: string; name: string } }) => category,
        ),
      })),
      nextCursor: null,
    };
  }

  async get(number: number) {
    const problem = await this.prisma.client.problem.findFirst({
      where: { number, status: "PUBLISHED", currentVersion: { isNot: null } },
      select: {
        id: true,
        number: true,
        title: true,
        difficulty: true,
        categories: { select: { category: { select: { slug: true, name: true } } } },
        currentVersion: {
          select: {
            id: true,
            version: true,
            statement: true,
            inputDescription: true,
            outputDescription: true,
            constraints: true,
            comparator: true,
            timeLimitMs: true,
            memoryLimitKiB: true,
            starterCode: true,
            testCases: {
              where: { visibility: "EXAMPLE" },
              orderBy: { position: "asc" },
              select: { id: true, position: true, input: true, expectedOutput: true, explanation: true },
            },
          },
        },
        lessons: {
          where: { lesson: { status: "PUBLISHED" } },
          orderBy: { order: "asc" },
          select: { lesson: { select: { slug: true, title: true } } },
        },
      },
    });
    if (!problem?.currentVersion) {
      throw new NotFoundException({ code: "PROBLEM_NOT_FOUND", message: "문제를 찾을 수 없습니다." });
    }
    return {
      ...problem,
      categories: problem.categories.map(
        ({ category }: { category: { slug: string; name: string } }) => category,
      ),
      lessons: problem.lessons.map(
        ({ lesson }: { lesson: { slug: string; title: string } }) => lesson,
      ),
    };
  }

  async categories() {
    return {
      items: await this.prisma.client.category.findMany({ orderBy: { name: "asc" } }),
      nextCursor: null,
    };
  }
}
