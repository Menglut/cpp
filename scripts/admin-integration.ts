import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnvironment } from "dotenv";
import { PrismaClient } from "../apps/api/src/generated/prisma/client";

loadEnvironment();

const apiBase =
  process.env.ADMIN_TEST_API_URL ?? "http://127.0.0.1:3001/api/v1";
const origin = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const cookies = new Map<string, string>();
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `admin-integration-${suffix}@example.test`;
const password = `T3st-${randomBytes(18).toString("base64url")}!`;
let userId: string | undefined;
let lessonId: string | undefined;
let problemId: string | undefined;
let validationId: string | undefined;

async function api<T>(
  path: string,
  init: RequestInit = {},
  expected = 200,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("origin", origin);
  if (init.body) headers.set("content-type", "application/json");
  const csrf = cookies.get("cppstudy_csrf");
  if (csrf && !["GET", "HEAD"].includes((init.method ?? "GET").toUpperCase())) {
    headers.set("x-csrf-token", decodeURIComponent(csrf));
  }
  if (cookies.size) {
    headers.set(
      "cookie",
      [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
    );
  }
  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  for (const value of response.headers.getSetCookie()) {
    const [pair] = value.split(";", 1);
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  const body = await response.json().catch(() => ({}));
  if (response.status !== expected) {
    throw new Error(
      `${init.method ?? "GET"} ${path}: expected ${expected}, got ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body as T;
}

async function main() {
  await api("/auth/csrf");
  const registered = await api<{ user: { id: string } }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, nickname: "관리자 통합 테스트" }),
    },
    201,
  );
  userId = registered.user.id;
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });

  const content = await api<{
    lessons: Array<{ id: string }>;
    problems: Array<{ id: string }>;
    categories: Array<{ id: string }>;
  }>("/admin/content");
  process.stdout.write(
    `✓ 관리자 콘텐츠 조회 (${content.lessons.length}개 강의, ${content.problems.length}개 문제)\n`,
  );

  const lesson = await api<{ id: string }>(
    "/admin/lessons",
    {
      method: "POST",
      body: JSON.stringify({
        slug: `integration-${suffix}`,
        title: "관리자 통합 테스트 강의",
        summary: "테스트 후 자동 삭제되는 강의입니다.",
        body: "# 관리자 통합 테스트",
        order: 9999,
      }),
    },
    201,
  );
  lessonId = lesson.id;
  await api(`/admin/lessons/${lessonId}/publish`, { method: "POST" }, 201);
  process.stdout.write("✓ 강의 생성 및 공개\n");

  const maximum = await prisma.problem.aggregate({ _max: { number: true } });
  const problemNumber = (maximum._max.number ?? 1000) + 1;
  const problem = await api<{ id: string; currentVersion: { id: string } }>(
    "/admin/problems",
    {
      method: "POST",
      body: JSON.stringify({
        number: problemNumber,
        title: "관리자 통합 테스트 문제",
        difficulty: 1,
        statement: "정수 2를 출력하세요.",
        inputDescription: "입력 없음",
        outputDescription: "2를 출력합니다.",
        constraints: "없음",
        comparator: "TOKEN",
        allowFinalNewline: true,
        timeLimitMs: 1000,
        memoryLimitKiB: 131072,
        starterCode: "#include <iostream>\nint main() { return 0; }",
        referenceSource:
          "#include <iostream>\nint main() { std::cout << 2 << '\\n'; }",
      }),
    },
    201,
  );
  problemId = problem.id;
  const versionId = problem.currentVersion.id;
  await api(`/admin/problem-versions/${versionId}/test-cases`, {
    method: "PUT",
    body: JSON.stringify({
      testCases: [
        {
          position: 1,
          visibility: "EXAMPLE",
          input: "",
          expectedOutput: "2\n",
        },
        { position: 2, visibility: "HIDDEN", input: "", expectedOutput: "2\n" },
        { position: 3, visibility: "HIDDEN", input: "", expectedOutput: "2\n" },
        { position: 4, visibility: "HIDDEN", input: "", expectedOutput: "2\n" },
      ],
    }),
  });
  await api(`/admin/problems/${problemId}/relations`, {
    method: "PUT",
    body: JSON.stringify({
      categoryIds: content.categories[0] ? [content.categories[0].id] : [],
      lessonIds: [lessonId],
    }),
  });
  process.stdout.write("✓ 문제, 테스트 및 연결 관계 저장\n");

  const requested = await api<{ validationId: string }>(
    `/admin/problem-versions/${versionId}/validate`,
    { method: "POST" },
    201,
  );
  validationId = requested.validationId;
  let validation: { status: string; diagnostic: string | null } | undefined;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    validation = await api(`/admin/problem-validations/${validationId}`);
    if (["PASSED", "FAILED", "SYSTEM_ERROR"].includes(validation.status)) break;
  }
  if (validation?.status !== "PASSED") {
    throw new Error(
      `기준 코드 검증 실패: ${validation?.status ?? "TIMEOUT"} ${validation?.diagnostic ?? ""}`,
    );
  }
  process.stdout.write("✓ 기준 코드 검증 통과\n");

  await api(
    `/admin/problem-versions/${versionId}/publish`,
    { method: "POST" },
    201,
  );
  const publicProblem = await api<{ number: number }>(
    `/problems/${problemNumber}`,
  );
  if (publicProblem.number !== problemNumber)
    throw new Error("공개 문제 조회 결과가 일치하지 않습니다.");
  await api(`/admin/problems/${problemId}`, { method: "DELETE" });
  await api(`/problems/${problemNumber}`, {}, 404);
  await api(`/admin/problems/${problemId}/restore`, { method: "POST" }, 201);
  process.stdout.write("✓ 문제 공개, 보관 및 복원\n");
}

async function cleanup() {
  if (userId) await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  if (validationId)
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: validationId },
    });
  if (problemId) await prisma.problem.deleteMany({ where: { id: problemId } });
  if (lessonId) await prisma.lesson.deleteMany({ where: { id: lessonId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}

main()
  .then(() => process.stdout.write("관리자 API 통합 테스트를 완료했습니다.\n"))
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(cleanup);
