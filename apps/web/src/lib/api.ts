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
  if (init.body) headers.set("content-type", "application/json");
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
}) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
