export type ApiUser = {
  id: string;
  email: string;
  nickname: string;
  role: "USER" | "ADMIN";
};

export type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  order: number;
  category: { id: string; slug: string; title: string; order: number };
};

export type LessonCategory = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  order: number;
  lessons: LessonSummary[];
};

export type LessonDetail = LessonSummary & {
  body: string;
  problems: Array<{
    id: string;
    number: number;
    title: string;
    difficulty: number;
    order: number;
  }>;
};

export type ProblemCategory = { slug: string; name: string };

export type ProblemSummary = {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  categories: ProblemCategory[];
};

export type ProblemDetail = ProblemSummary & {
  currentVersion: {
    id: string;
    version: number;
    statement: string;
    inputDescription: string;
    outputDescription: string;
    constraints: string;
    comparator: "TOKEN" | "EXACT";
    timeLimitMs: number;
    memoryLimitKiB: number;
    starterCode: string;
    testCases: Array<{
      id: string;
      position: number;
      input: string;
      expectedOutput: string;
      explanation: string | null;
    }>;
  };
  lessons: Array<{ slug: string; title: string }>;
};

export type ExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "COMPILING"
  | "RUNNING"
  | "SUCCESS"
  | "AC"
  | "WA"
  | "CE"
  | "RE"
  | "TLE"
  | "MLE"
  | "OLE"
  | "SYSTEM_ERROR"
  | "CANCELLED";

export type RunResult = {
  id: string;
  status: ExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  executionTimeMs: number | null;
  memoryUsageKiB: number | null;
  createdAt: string;
  finishedAt: string | null;
};

export type SubmissionSummary = {
  id: string;
  status: ExecutionStatus;
  language: "CPP17";
  executionTimeMs: number | null;
  memoryUsageKiB: number | null;
  checkedCount: number;
  passedCount: number;
  totalCount: number;
  createdAt: string;
  finishedAt: string | null;
  problem: { number: number; title: string };
};

export type SubmissionDetail = SubmissionSummary & {
  problemId: string;
  problemVersionId: string;
  sourceCode: string;
  allowedDiagnostic: string | null;
  compilerVersion: string | null;
  problemVersion: { version: number };
};

export type LearningProgress = {
  completedLessonSlugs: string[];
  solvedProblemNumbers: number[];
  submissionCount: number;
};

export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ValidationStatus =
  "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "SYSTEM_ERROR";

export type AdminContent = {
  lessons: Array<{
    id: string;
    categoryId: string;
    slug: string;
    title: string;
    status: ContentStatus;
    order: number;
    updatedAt: string;
    editableVersionId: string | null;
    editableVersion: number | null;
  }>;
  problems: Array<{
    id: string;
    number: number;
    title: string;
    difficulty: number;
    status: ContentStatus;
    updatedAt: string;
    currentVersionId: string | null;
    editableVersionId: string | null;
    editableVersion: number | null;
  }>;
  categories: Array<{ id: string; slug: string; name: string }>;
  lessonCategories: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    order: number;
    status: ContentStatus;
    _count: { lessons: number };
  }>;
};

export type AdminLesson = {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  order: number;
  status: ContentStatus;
  publishedAt: string | null;
  editable: boolean;
  currentVersionId: string | null;
  editableVersion: {
    id: string;
    version: number;
    title: string;
    summary: string;
    body: string;
    publishedAt: string | null;
  } | null;
  problems: Array<{ problemId: string; order: number }>;
};

export type ContentAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  altText: string;
  createdAt: string;
  url: string;
};

export type AdminProblemVersion = {
  id: string;
  version: number;
  title: string;
  difficulty: number;
  statement: string;
  inputDescription: string;
  outputDescription: string;
  constraints: string;
  comparator: "TOKEN" | "EXACT";
  allowFinalNewline: boolean;
  timeLimitMs: number;
  memoryLimitKiB: number;
  starterCode: string;
  referenceSource: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
  testCases: Array<{
    id: string;
    position: number;
    visibility: "EXAMPLE" | "HIDDEN";
    input: string;
    expectedOutput: string;
    explanation: string | null;
  }>;
  validations?: Array<AdminValidation>;
};

export type AdminProblem = {
  id: string;
  number: number;
  title: string;
  difficulty: number;
  status: ContentStatus;
  currentVersionId: string | null;
  editable: boolean;
  editableVersion: AdminProblemVersion | null;
  categoryIds: string[];
  lessonIds: string[];
};

export type AdminValidation = {
  id: string;
  problemVersionId: string;
  status: ValidationStatus;
  diagnostic: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type AdminInvitation = {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  invitedBy: { nickname: string; email: string };
};

type AuthResponse = { user: ApiUser };
type ApiErrorBody = {
  message?: string | string[];
  code?: string;
  error?: { message?: string | string[]; code?: string };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001/api/v1";
const CSRF_COOKIE = "cppstudy_csrf";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function cookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

async function ensureCsrfToken() {
  let token = cookie(CSRF_COOKIE);
  if (!token) {
    await request("/auth/csrf", { method: "GET" }, false);
    token = cookie(CSRF_COOKIE);
  }
  if (!token) throw new ApiError("보안 토큰을 발급받지 못했습니다.", 0);
  return decodeURIComponent(token);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  withCsrf = true,
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (withCsrf && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("x-csrf-token", await ensureCsrfToken());
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("API 서버에 연결할 수 없습니다.", 0);
  }

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!response.ok) {
    const details = body.error ?? body;
    const message = Array.isArray(details.message)
      ? details.message.join(" ")
      : details.message || "요청을 처리하지 못했습니다.";
    throw new ApiError(message, response.status, details.code);
  }
  return body;
}

export async function getCurrentUser() {
  try {
    const result = await request<AuthResponse>("/users/me");
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function register(input: {
  email: string;
  password: string;
  nickname: string;
  inviteToken: string;
}) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getInvitation(token: string) {
  return request<{ email: string; expiresAt: string }>(
    `/auth/invitations/${encodeURIComponent(token)}`,
  );
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout() {
  return request<{ success: true }>("/auth/logout", { method: "POST" });
}

export async function listLessons() {
  return (await request<{ items: LessonSummary[] }>("/lessons")).items;
}

export function getLessonCatalog() {
  return request<{ items: LessonSummary[]; categories: LessonCategory[] }>(
    "/lessons",
  );
}

export function getLesson(slug: string) {
  return request<LessonDetail>(`/lessons/${encodeURIComponent(slug)}`);
}

export async function listProblems() {
  return (await request<{ items: ProblemSummary[] }>("/problems?limit=100"))
    .items;
}

export function getProblem(number: number) {
  return request<ProblemDetail>(`/problems/${number}`);
}

export async function listProblemCategories() {
  return (await request<{ items: ProblemCategory[] }>("/categories")).items;
}

export function createRun(input: {
  problemVersionId: string;
  language: "CPP17";
  sourceCode: string;
  stdin: string;
}) {
  return request<{ runId: string; status: ExecutionStatus }>("/runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getRun(id: string) {
  return request<RunResult>(`/runs/${encodeURIComponent(id)}`);
}

export function createSubmission(
  input: {
    problemVersionId: string;
    language: "CPP17";
    sourceCode: string;
  },
  idempotencyKey: string,
) {
  return request<{ submissionId: string; status: ExecutionStatus }>(
    "/submissions",
    {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      body: JSON.stringify(input),
    },
  );
}

export function getSubmission(id: string) {
  return request<SubmissionDetail>(`/submissions/${encodeURIComponent(id)}`);
}

export async function listMySubmissions(limit = 100) {
  return (
    await request<{ items: SubmissionSummary[] }>(
      `/users/me/submissions?limit=${limit}`,
    )
  ).items;
}

export function getLearningProgress() {
  return request<LearningProgress>("/users/me/progress");
}

export function setLessonCompletion(slug: string, completed: boolean) {
  return request<{ slug: string; completed: boolean }>(
    `/users/me/lessons/${encodeURIComponent(slug)}/completion`,
    { method: "PUT", body: JSON.stringify({ completed }) },
  );
}

export function listAdminContent() {
  return request<AdminContent>("/admin/content");
}

export async function listAdminInvitations() {
  return (await request<{ items: AdminInvitation[] }>("/admin/invitations"))
    .items;
}

export function createAdminInvitation(email: string) {
  return request<{
    id: string;
    email: string;
    expiresAt: string;
    createdAt: string;
    token: string;
  }>("/admin/invitations", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function revokeAdminInvitation(id: string) {
  return request<AdminInvitation>(
    `/admin/invitations/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function getAdminLesson(id: string) {
  return request<AdminLesson>(`/admin/lessons/${encodeURIComponent(id)}`);
}

export function getAdminProblem(id: string) {
  return request<AdminProblem>(`/admin/problems/${encodeURIComponent(id)}`);
}

export function createAdminLesson(input: {
  categoryId: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  order: number;
}) {
  return request<AdminLesson>("/admin/lessons", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type AdminLessonCategoryInput = {
  slug: string;
  title: string;
  summary: string;
  order: number;
};

export function createAdminLessonCategory(input: AdminLessonCategoryInput) {
  return request<AdminContent["lessonCategories"][number]>(
    "/admin/lesson-categories",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function updateAdminLessonCategory(
  id: string,
  input: AdminLessonCategoryInput,
) {
  return request<AdminContent["lessonCategories"][number]>(
    `/admin/lesson-categories/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function setAdminLessonCategoryStatus(
  id: string,
  action: "publish" | "restore" | "archive",
) {
  return request<AdminContent["lessonCategories"][number]>(
    `/admin/lesson-categories/${encodeURIComponent(id)}${action === "archive" ? "" : `/${action}`}`,
    { method: action === "archive" ? "DELETE" : "POST" },
  );
}

export function updateAdminLesson(
  id: string,
  input: Omit<Parameters<typeof createAdminLesson>[0], "slug">,
) {
  return request<AdminLesson>(`/admin/lessons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createAdminLessonVersion(id: string) {
  return request<NonNullable<AdminLesson["editableVersion"]>>(
    `/admin/lessons/${encodeURIComponent(id)}/versions`,
    { method: "POST" },
  );
}

export async function listAdminAssets() {
  return (await request<{ items: ContentAsset[] }>("/admin/assets")).items;
}

export function uploadAdminAsset(file: File, altText: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("altText", altText);
  return request<ContentAsset>("/admin/assets", { method: "POST", body });
}

export function deleteAdminAsset(id: string) {
  return request<{ success: true }>(`/admin/assets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function mediaUrl(asset: ContentAsset) {
  return asset.url.startsWith("http")
    ? asset.url
    : `${API_BASE}${asset.url.replace(/^\/api\/v1/, "")}`;
}

export function setAdminLessonProblems(id: string, problemIds: string[]) {
  return request<{ success: true }>(
    `/admin/lessons/${encodeURIComponent(id)}/problems`,
    {
      method: "PUT",
      body: JSON.stringify({
        problems: problemIds.map((problemId, order) => ({ problemId, order })),
      }),
    },
  );
}

export function publishAdminLesson(id: string) {
  return request<AdminLesson>(
    `/admin/lessons/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
  );
}

export function archiveAdminLesson(id: string) {
  return request<AdminLesson>(`/admin/lessons/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function restoreAdminLesson(id: string) {
  return request<AdminLesson>(
    `/admin/lessons/${encodeURIComponent(id)}/restore`,
    { method: "POST" },
  );
}

export type AdminProblemInput = {
  number?: number;
  title: string;
  difficulty: number;
  statement: string;
  inputDescription: string;
  outputDescription: string;
  constraints: string;
  comparator: "TOKEN" | "EXACT";
  allowFinalNewline: boolean;
  timeLimitMs: number;
  memoryLimitKiB: number;
  starterCode: string;
  referenceSource: string;
};

export function createAdminProblem(
  input: AdminProblemInput & { number: number },
) {
  return request<{ id: string; currentVersion: AdminProblemVersion }>(
    "/admin/problems",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateAdminProblemVersion(
  id: string,
  input: AdminProblemInput,
) {
  const { number: _number, ...body } = input;
  return request<AdminProblemVersion>(
    `/admin/problem-versions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export function createAdminProblemVersion(id: string) {
  return request<AdminProblemVersion>(
    `/admin/problems/${encodeURIComponent(id)}/versions`,
    { method: "POST" },
  );
}

export function setAdminProblemRelations(
  id: string,
  categoryIds: string[],
  lessonIds: string[],
) {
  return request<{ success: true }>(
    `/admin/problems/${encodeURIComponent(id)}/relations`,
    {
      method: "PUT",
      body: JSON.stringify({ categoryIds, lessonIds }),
    },
  );
}

export function setAdminProblemTests(
  versionId: string,
  testCases: Array<{
    position: number;
    visibility: "EXAMPLE" | "HIDDEN";
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>,
) {
  return request<{ success: true }>(
    `/admin/problem-versions/${encodeURIComponent(versionId)}/test-cases`,
    {
      method: "PUT",
      body: JSON.stringify({ testCases }),
    },
  );
}

export function requestAdminProblemValidation(versionId: string) {
  return request<{ validationId: string; status: ValidationStatus }>(
    `/admin/problem-versions/${encodeURIComponent(versionId)}/validate`,
    { method: "POST" },
  );
}

export function getAdminProblemValidation(id: string) {
  return request<AdminValidation>(
    `/admin/problem-validations/${encodeURIComponent(id)}`,
  );
}

export function publishAdminProblemVersion(versionId: string) {
  return request<{ id: string; status: ContentStatus }>(
    `/admin/problem-versions/${encodeURIComponent(versionId)}/publish`,
    { method: "POST" },
  );
}

export function archiveAdminProblem(id: string) {
  return request<{ id: string; status: ContentStatus }>(
    `/admin/problems/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function restoreAdminProblem(id: string) {
  return request<{ id: string; status: ContentStatus }>(
    `/admin/problems/${encodeURIComponent(id)}/restore`,
    { method: "POST" },
  );
}
