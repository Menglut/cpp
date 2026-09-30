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
let lessonCategoryId: string | undefined;
let problemId: string | undefined;
let validationId: string | undefined;
let assetId: string | undefined;

async function api<T>(
  path: string,
  init: RequestInit = {},
  expected = 200,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("origin", origin);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
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
    lessonCategories: Array<{ id: string; slug: string }>;
  }>("/admin/content");
  if (!content.lessonCategories[0])
    throw new Error("학습 카테고리가 없습니다.");
  process.stdout.write(
    `✓ 관리자 콘텐츠 조회 (${content.lessons.length}개 강의, ${content.problems.length}개 문제)\n`,
  );

  const lessonCategory = await api<{ id: string }>(
    "/admin/lesson-categories",
    {
      method: "POST",
      body: JSON.stringify({
        slug: `integration-category-${suffix}`,
        title: "통합 테스트 카테고리",
        summary: "테스트 후 자동 삭제되는 카테고리입니다.",
        order: 9999,
      }),
    },
    201,
  );
  lessonCategoryId = lessonCategory.id;
  const duplicateSlugResponse = await api<{
    error: { code: string };
  }>(
    `/admin/lesson-categories/${lessonCategoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ slug: content.lessonCategories[0].slug }),
    },
    409,
  );
  if (
    duplicateSlugResponse.error.code !== "LESSON_CATEGORY_SLUG_ALREADY_EXISTS"
  ) {
    throw new Error("중복 학습 카테고리 Slug 오류 코드가 올바르지 않습니다.");
  }
  const updatedCategorySlug = `integration-category-updated-${suffix}`;
  const updatedCategory = await api<{ slug: string; title: string }>(
    `/admin/lesson-categories/${lessonCategoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        slug: updatedCategorySlug,
        title: "수정된 통합 테스트 카테고리",
      }),
    },
  );
  if (
    updatedCategory.slug !== updatedCategorySlug ||
    updatedCategory.title !== "수정된 통합 테스트 카테고리"
  ) {
    throw new Error("학습 카테고리 Slug 또는 이름이 수정되지 않았습니다.");
  }
  await api(
    `/admin/lesson-categories/${lessonCategoryId}/publish`,
    { method: "POST" },
    201,
  );
  const catalog = await api<{ categories: Array<{ id: string }> }>("/lessons");
  if (!catalog.categories.some((item) => item.id === lessonCategoryId))
    throw new Error("공개 학습 카테고리가 목록에 없습니다.");
  process.stdout.write("✓ 학습 카테고리 생성, 수정 및 공개\n");

  const image = new FormData();
  image.append("altText", "통합 테스트 이미지");
  image.append(
    "file",
    new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: "image/png",
    }),
    "integration.png",
  );
  const asset = await api<{ id: string; url: string }>(
    "/admin/assets",
    { method: "POST", body: image },
    201,
  );
  assetId = asset.id;
  await api(asset.url.replace("/api/v1", ""));
  const assets = await api<{ items: Array<{ id: string }> }>("/admin/assets");
  if (!assets.items.some((item) => item.id === assetId))
    throw new Error("업로드한 이미지가 목록에 없습니다.");
  process.stdout.write("✓ 이미지 업로드, 공개 조회 및 목록 조회\n");

  const lesson = await api<{ id: string }>(
    "/admin/lessons",
    {
      method: "POST",
      body: JSON.stringify({
        categoryId: lessonCategoryId,
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
  await api(`/admin/lessons/${lessonId}/versions`, { method: "POST" }, 201);
  const updatedLesson = await api<{ id: string }>(
    `/admin/lessons/${lessonId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: "관리자 통합 테스트 강의 v2",
        summary: "버전 게시 테스트",
        body: "# 새 버전 본문",
        order: 9999,
      }),
    },
  );
  if (updatedLesson.id !== lessonId)
    throw new Error("강의 수정 응답의 ID가 강의 ID와 일치하지 않습니다.");
  await api(`/admin/lessons/${updatedLesson.id}/problems`, {
    method: "PUT",
    body: JSON.stringify({ problems: [] }),
  });
  const beforeLessonPublish = await api<{ body: string }>(
    `/lessons/integration-${suffix}`,
  );
  if (beforeLessonPublish.body !== "# 관리자 통합 테스트")
    throw new Error("초안 공개 전 기존 강의 버전이 유지되지 않았습니다.");
  await api(`/admin/lessons/${lessonId}/publish`, { method: "POST" }, 201);
  const afterLessonPublish = await api<{ body: string }>(
    `/lessons/integration-${suffix}`,
  );
  if (afterLessonPublish.body !== "# 새 버전 본문")
    throw new Error("새 강의 버전이 공개되지 않았습니다.");
  const groupedCatalog = await api<{
    categories: Array<{ id: string; lessons: Array<{ slug: string }> }>;
  }>("/lessons");
  const groupedCategory = groupedCatalog.categories.find(
    (item) => item.id === lessonCategoryId,
  );
  if (
    !groupedCategory?.lessons.some(
      (item) => item.slug === `integration-${suffix}`,
    )
  )
    throw new Error("강의가 학습 카테고리 아래에 표시되지 않습니다.");
  process.stdout.write("✓ 강의 생성, 버전 격리 및 새 버전 공개\n");
  await api(`/admin/lesson-categories/${lessonCategoryId}`, {
    method: "DELETE",
  });
  await api(`/lessons/integration-${suffix}`, {}, 404);
  await api(
    `/admin/lesson-categories/${lessonCategoryId}/publish`,
    { method: "POST" },
    201,
  );
  process.stdout.write("✓ 카테고리 보관에 따른 공개 강의 숨김\n");

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
        starterCodeC11: "#include <stdio.h>\nint main(void) { return 0; }",
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
  await api(`/admin/assets/${assetId}`, { method: "DELETE" });
  assetId = undefined;
  process.stdout.write("✓ 이미지 삭제\n");
}

async function cleanup() {
  if (assetId) await prisma.contentAsset.deleteMany({ where: { id: assetId } });
  if (userId) await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  if (validationId)
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: validationId },
    });
  if (problemId) await prisma.problem.deleteMany({ where: { id: problemId } });
  if (lessonId) await prisma.lesson.deleteMany({ where: { id: lessonId } });
  if (lessonCategoryId)
    await prisma.lessonCategory.deleteMany({ where: { id: lessonCategoryId } });
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
