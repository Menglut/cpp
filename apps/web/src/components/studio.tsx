"use client";
import Link from "next/link";
import Admin from "./admin";
import Markdown from "./markdown";
import ConfirmDialog from "./confirm-dialog";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Copy,
  FileCode2,
  GraduationCap,
  ListChecks,
  LogOut,
  Play,
  Search,
  Shield,
  Terminal,
} from "lucide-react";
import { verdicts } from "@/lib/data";
import {
  ApiError,
  createRun,
  createSubmission,
  getCurrentUser,
  getLearningProgress,
  getLesson,
  getProblem,
  getRun,
  getSubmission,
  listLessons,
  listProblemCategories,
  listProblems,
  listMySubmissions,
  login,
  logout,
  register,
  setLessonCompletion,
  type ApiUser,
  type LessonDetail,
  type LessonSummary,
  type ProblemCategory,
  type ProblemDetail,
  type ProblemSummary,
  type RunResult,
  type SubmissionDetail,
  type SubmissionSummary,
} from "@/lib/api";
const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">코드 에디터를 불러오는 중…</div>
  ),
});
type User = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
};
const toUser = (user: ApiUser): User => ({ ...user, name: user.nickname });
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
const A = ({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) => (
  <Link
    className={secondary ? "button secondary" : "button primary"}
    href={href}
  >
    {children}
    <ArrowRight size={16} />
  </Link>
);
const failureStatuses = new Set([
  "WA",
  "CE",
  "RE",
  "TLE",
  "MLE",
  "OLE",
  "SYSTEM_ERROR",
  "CANCELLED",
]);
function Badge({ status }: { status: string }) {
  return (
    <span
      className={
        "badge " +
        (status === "AC"
          ? "green"
          : ["PENDING", "QUEUED", "COMPILING", "RUNNING"].includes(status)
            ? "amber"
            : failureStatuses.has(status)
              ? "red"
              : "gray")
      }
    >
      {verdicts[status] || status}
    </span>
  );
}
const processingStatuses = new Set([
  "PENDING",
  "QUEUED",
  "COMPILING",
  "RUNNING",
]);
async function pollUntilFinished<T extends { status: string }>(
  readResult: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await readResult();
    if (!processingStatuses.has(result.status)) return result;
    const delay = document.hidden ? 5000 : Math.min(1000 + attempt * 250, 5000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new ApiError(
    "처리 시간이 길어지고 있습니다. 기록 화면에서 다시 확인해 주세요.",
    408,
  );
}
function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="icon-text"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}{" "}
      {done ? "복사 완료" : "복사"}
    </button>
  );
}
export default function Studio() {
  const path = usePathname(),
    router = useRouter();
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [lessons, setLessons] = useState<LessonSummary[]>([]),
    [problems, setProblems] = useState<ProblemSummary[]>([]),
    [categories, setCategories] = useState<ProblemCategory[]>([]),
    [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null),
    [problemDetail, setProblemDetail] = useState<ProblemDetail | null>(null),
    [submissionDetail, setSubmissionDetail] = useState<SubmissionDetail | null>(
      null,
    ),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(""),
    [submissions, setSubmissions] = useState<SubmissionSummary[]>([]),
    [completed, setCompleted] = useState<string[]>([]),
    [solvedNumbers, setSolvedNumbers] = useState<number[]>([]),
    [toast, setToast] = useState("");
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getCurrentUser(),
      listLessons(),
      listProblems(),
      listProblemCategories(),
    ])
      .then(([current, lessonList, problemList, categoryList]) => {
        if (!active) return;
        if (current.status === "fulfilled")
          setUser(current.value ? toUser(current.value) : null);
        if (lessonList.status === "fulfilled") setLessons(lessonList.value);
        if (problemList.status === "fulfilled") setProblems(problemList.value);
        if (categoryList.status === "fulfilled")
          setCategories(categoryList.value);
        const failed = [current, lessonList, problemList, categoryList].find(
          (result) => result.status === "rejected",
        );
        if (failed?.status === "rejected") {
          setToast(
            failed.reason instanceof ApiError
              ? failed.reason.message
              : "학습 콘텐츠를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const parts = path.split("/").filter(Boolean);
    const load = async () => {
      setDetailError("");
      if (parts[0] === "learn" && parts[1]) {
        setDetailLoading(true);
        setLessonDetail(null);
        try {
          const lesson = await getLesson(parts[1]);
          if (active) setLessonDetail(lesson);
        } catch (error) {
          if (active)
            setDetailError(
              error instanceof ApiError
                ? error.message
                : "강의를 불러오지 못했습니다.",
            );
        } finally {
          if (active) setDetailLoading(false);
        }
      } else if (parts[0] === "problems" && parts[1]) {
        setDetailLoading(true);
        setProblemDetail(null);
        try {
          const problem = await getProblem(Number(parts[1]));
          if (active) setProblemDetail(problem);
        } catch (error) {
          if (active)
            setDetailError(
              error instanceof ApiError
                ? error.message
                : "문제를 불러오지 못했습니다.",
            );
        } finally {
          if (active) setDetailLoading(false);
        }
      } else if (parts[0] === "submissions" && parts[1] && user) {
        setDetailLoading(true);
        setSubmissionDetail(null);
        try {
          const first = await getSubmission(parts[1]);
          const submission = processingStatuses.has(first.status)
            ? await pollUntilFinished(() => getSubmission(parts[1]))
            : first;
          if (active) setSubmissionDetail(submission);
        } catch (error) {
          if (active)
            setDetailError(
              error instanceof ApiError
                ? error.message
                : "제출 기록을 불러오지 못했습니다.",
            );
        } finally {
          if (active) setDetailLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [path, user]);
  useEffect(() => {
    let active = true;
    if (!user) {
      setCompleted([]);
      setSubmissions([]);
      setSolvedNumbers([]);
      return;
    }
    Promise.all([getLearningProgress(), listMySubmissions()])
      .then(([progress, items]) => {
        if (!active) return;
        setCompleted(progress.completedLessonSlugs);
        setSolvedNumbers(progress.solvedProblemNumbers);
        setSubmissions(items);
      })
      .catch((error) => {
        if (active)
          setToast(
            error instanceof ApiError
              ? error.message
              : "학습 기록을 불러오지 못했습니다.",
          );
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const mine = submissions,
    solved = new Set(solvedNumbers);
  const status = (id: number) =>
    solved.has(id)
      ? "해결"
      : mine.some(
            (s) =>
              s.problem.number === id &&
              ![
                "PENDING",
                "QUEUED",
                "COMPILING",
                "RUNNING",
                "SYSTEM_ERROR",
              ].includes(s.status),
          )
        ? "시도 중"
        : "미시도";
  const notify = (message: string) => setToast(message);
  const signOut = async () => {
    try {
      await logout();
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : "로그아웃에 실패했습니다.",
      );
      return;
    }
    if (user) {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("cppstudy:draft:" + user.email + ":"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
    setUser(null);
    router.push("/");
    notify("로그아웃했어요. 이 계정의 코드 초안도 정리했습니다.");
  };
  async function signIn(input: {
    register: boolean;
    name: string;
    email: string;
    password: string;
  }) {
    const result = input.register
      ? await register({
          email: input.email,
          password: input.password,
          nickname: input.name,
        })
      : await login({ email: input.email, password: input.password });
    setUser(toUser(result.user));
    const target = new URLSearchParams(location.search).get("next");
    router.push(
      target && target.startsWith("/") && !target.startsWith("//")
        ? target
        : "/me",
    );
    notify(input.register ? "회원가입이 완료됐어요." : "로그인했어요.");
  }
  async function refreshSubmissions() {
    if (user) {
      const [items, progress] = await Promise.all([
        listMySubmissions(),
        getLearningProgress(),
      ]);
      setSubmissions(items);
      setSolvedNumbers(progress.solvedProblemNumbers);
    }
  }
  async function updateLessonCompletion(slug: string, value: boolean) {
    try {
      await setLessonCompletion(slug, value);
      setCompleted((current) =>
        value
          ? current.includes(slug)
            ? current
            : [...current, slug]
          : current.filter((item) => item !== slug),
      );
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "학습 완료 상태를 저장하지 못했습니다.",
      );
    }
  }
  const parts = path.split("/").filter(Boolean);
  let content: ReactNode;
  if (!ready)
    content = <div className="loading">학습 공간을 준비하고 있어요…</div>;
  else if (path === "/")
    content = user ? (
      <LearnerHome
        user={user}
        lessons={lessons}
        problems={problems}
        completed={completed}
        solved={solved}
        submissions={mine}
        status={status}
      />
    ) : (
      <GuestHome />
    );
  else if (path === "/learn")
    content = (
      <>
        <PageTitle
          eyebrow="CURRICULUM"
          title="C++ 학습"
          description="처음 만나는 문법부터 STL까지. 이해의 폭을 한 단계씩 넓혀 보세요."
        />
        <div className="info-strip">
          <GraduationCap size={20} /> 공개 강의 {lessons.length}개{" "}
          <span>데이터베이스에 공개된 과정만 표시됩니다.</span>
        </div>
        <div className="lesson-grid">
          {lessons.map((l, i) => (
            <Link
              href={"/learn/" + l.slug}
              className="lesson-card"
              key={l.slug}
            >
              <div className="card-top">
                <span className="chapter-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {completed.includes(l.slug) ? (
                  <span className="badge green">학습 완료</span>
                ) : (
                  <span className="badge gray">기초 과정</span>
                )}
              </div>
              <BookOpen className="lesson-icon" size={28} />
              <h2>{l.title}</h2>
              <p>{l.summary}</p>
              <div className="card-footer">
                <span>CHAPTER {String(l.order).padStart(2, "0")}</span>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  else if (parts[0] === "learn" && parts[1])
    content = detailLoading ? (
      <div className="loading">강의를 불러오고 있어요…</div>
    ) : detailError ? (
      <ContentError message={detailError} />
    ) : lessonDetail ? (
      <LessonView
        lesson={lessonDetail}
        lessons={lessons}
        completed={completed}
        user={user}
        onCompletionChange={updateLessonCompletion}
      />
    ) : (
      <NotFound />
    );
  else if (path === "/problems")
    content = (
      <ProblemList
        problems={problems}
        categories={categories}
        status={status}
      />
    );
  else if (parts[0] === "problems" && parts[1]) {
    content = detailLoading ? (
      <div className="loading">문제를 불러오고 있어요…</div>
    ) : detailError ? (
      <ContentError message={detailError} />
    ) : problemDetail ? (
      <Workspace
        key={`${problemDetail.number}:${user?.email || "guest"}`}
        problem={problemDetail}
        user={user}
        submissions={mine}
        onSubmissionFinished={refreshSubmissions}
        notify={notify}
      />
    ) : (
      <NotFound />
    );
  } else if (path === "/login" || path === "/register")
    content = <Auth registerMode={path === "/register"} onSignIn={signIn} />;
  else if (parts[0] === "me")
    content = user ? (
      <>
        <PageTitle
          eyebrow="MY LEARNING"
          title={`${user.name}님의 학습 기록`}
          description="시도한 모든 코드에 배움이 남아 있어요."
        />
        <div className="stats">
          <Stat
            icon={<BookOpen />}
            label="완료한 강의"
            value={String(completed.length)}
            unit="개"
            note="직접 완료한 강의"
          />
          <Stat
            icon={<Check />}
            label="해결한 문제"
            value={String(solved.size)}
            unit="개"
            note="실제 제출 판정 기준"
          />
          <Stat
            icon={<FileCode2 />}
            label="전체 제출"
            value={String(mine.length)}
            unit="회"
            note="실행 기록은 제외"
          />
        </div>
        <SectionTitle
          title="제출 기록"
          sub="제출 시점의 코드와 결과를 다시 확인하세요"
        />
        <SubmissionTable items={mine} />
      </>
    ) : (
      <LoginPrompt path={path} />
    );
  else if (parts[0] === "submissions") {
    content = !user ? (
      <LoginPrompt path={path} />
    ) : detailLoading ? (
      <div className="loading">제출 기록을 불러오고 있어요…</div>
    ) : detailError ? (
      <ContentError message={detailError} />
    ) : submissionDetail ? (
      <>
        <PageTitle
          eyebrow="SUBMISSION DETAIL"
          title={`${submissionDetail.problem.number}. ${submissionDetail.problem.title}`}
          description="제출 시점에 저장된 소스입니다. 이후 편집한 초안과 별개로 보관됩니다."
        />
        <section className="submission-summary">
          <Badge status={submissionDetail.status} />
          <span>
            {new Date(submissionDetail.createdAt).toLocaleString("ko-KR")}
          </span>
          <span>C++17 · 문제 v{submissionDetail.problemVersion.version}</span>
          <span>
            {submissionDetail.executionTimeMs ?? "측정 없음"} ms ·{" "}
            {submissionDetail.memoryUsageKiB
              ? `${Math.round(submissionDetail.memoryUsageKiB / 1024)} MiB`
              : "메모리 측정 없음"}
          </span>
        </section>
        <div className="info-strip">
          {submissionDetail.allowedDiagnostic ??
            "실행 제공자의 진단 정보가 없습니다."}
        </div>
        <div className="code-block">
          <div>
            <span>제출 소스 · main.cpp</span>
            <CopyCode code={submissionDetail.sourceCode} />
          </div>
          <HighlightedCode code={submissionDetail.sourceCode} />
        </div>
        <div className="actions">
          <A href={"/problems/" + submissionDetail.problem.number}>다시 풀기</A>
          <A href="/me/submissions" secondary>
            제출 기록
          </A>
        </div>
      </>
    ) : (
      <NotFound />
    );
  } else if (parts[0] === "admin")
    content = !user ? (
      <LoginPrompt path={path} />
    ) : user.role !== "ADMIN" ? (
      <div className="empty">
        <Shield />
        <h2>관리자 권한이 필요해요</h2>
        <p>관리자 계정으로 다시 로그인해 주세요.</p>
      </div>
    ) : (
      <Admin notify={notify} />
    );
  else content = <NotFound />;
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <Code2 size={24} />
            </span>
            Cpp<span>Study</span>
            <small>BETA</small>
          </Link>
          <nav aria-label="주요 메뉴">
            {[
              ["/", "홈"],
              ["/learn", "C++ 학습"],
              ["/problems", "문제"],
              ["/me", "내 학습"],
            ].map(([href, label]) => (
              <Link
                key={href}
                className={
                  (href === "/" ? path === "/" : path.startsWith(href))
                    ? "active"
                    : ""
                }
                href={href}
              >
                {label}
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className={path.startsWith("/admin") ? "active" : ""}
              >
                관리자
              </Link>
            )}
          </nav>
          <div className="header-account">
            <Link
              href="/problems"
              aria-label="문제 검색"
              className="search-icon"
            >
              <Search size={19} />
            </Link>
            {user ? (
              <>
                <Link href="/me" className="avatar" title={user.name}>
                  {user.name.slice(0, 1)}
                </Link>
                <button
                  className="logout"
                  aria-label="로그아웃"
                  onClick={signOut}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link href="/login" className="login-link">
                로그인 <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>
      {path !== "/" && (
        <div className="prototype-strip">
          <span className="dot" /> 프론트엔드 프로토타입{" "}
          <span className="strip-divider">|</span> 인증은 API 연결 완료,
          실행·채점은 데모이며, 데이터는 이 브라우저에 저장됩니다.
        </div>
      )}
      <main
        id="main"
        className={
          "main " + (parts[0] === "problems" && parts[1] ? "wide" : "")
        }
      >
        {content}
      </main>
      <footer>
        <Link href="/" className="footer-brand">
          CppStudy<span>한 줄의 코드, 한 걸음의 성장.</span>
        </Link>
        <span>C++17 학습 공간 · Frontend prototype</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function GuestHome() {
  return (
    <>
      <section className="hero guest-hero">
        <div>
          <span className="hero-label">
            <span className="dot" /> LEARN BY DOING
          </span>
          <h1>
            코드로 이해하는 C++,
            <br />
            나만의 속도로 시작해요<span className="green-text">.</span>
          </h1>
          <p>
            읽기 쉬운 개념 설명과 바로 이어지는 문제 풀이로
            <br />첫 코드부터 차근차근 실력을 쌓아 보세요.
          </p>
          <A href="/learn/io">첫 강의 시작하기</A>
          <Link className="hero-link" href="/problems">
            문제 먼저 둘러보기 <ArrowUpRight size={15} />
          </Link>
        </div>
        <CodePreview />
      </section>
      <section className="guest-flow" aria-labelledby="guest-flow-title">
        <div className="guest-flow-heading">
          <span className="eyebrow">A SIMPLE LEARNING LOOP</span>
          <h2 id="guest-flow-title">배우고, 풀고, 내 것으로 만들어요.</h2>
        </div>
        <div className="guest-flow-steps">
          {[
            [
              <BookOpen key="learn" />,
              "01",
              "핵심 개념 익히기",
              "짧고 명확한 설명과 예제로 이해해요.",
            ],
            [
              <Code2 key="solve" />,
              "02",
              "직접 코드 작성하기",
              "배운 내용과 연결된 문제를 바로 풀어요.",
            ],
            [
              <ListChecks key="record" />,
              "03",
              "기록하며 성장하기",
              "제출 기록을 돌아보고 다시 도전해요.",
            ],
          ].map(([icon, number, title, description]) => (
            <div className="guest-flow-card" key={String(number)}>
              <div className="guest-flow-icon">{icon}</div>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function CodePreview() {
  return (
    <div className="code-illustration">
      <div className="window-bar">
        <i />
        <i />
        <i />
        <span>hello_world.cpp</span>
        <span>C++17</span>
      </div>
      <pre>
        <span className="muted-code">01 </span>
        <span className="code-purple">#include</span>{" "}
        <span className="code-yellow">&lt;iostream&gt;</span>
        {"\n\n"}
        <span className="muted-code">03 </span>
        <span className="code-purple">int</span>{" "}
        <span className="code-blue">main</span>() {"{"}
        {"\n"}
        <span className="muted-code">04 </span> std::cout &lt;&lt;{" "}
        <span className="code-yellow">"Hello, C++!"</span>;{"\n"}
        <span className="muted-code">05 </span>{" "}
        <span className="code-purple">return</span>{" "}
        <span className="code-orange">0</span>;{"\n"}
        <span className="muted-code">06 </span>
        {"}"}
      </pre>
      <div className="terminal-preview">
        <Terminal size={14} /> Hello, C++!{" "}
        <span>첫 번째 코드가 실행됐어요</span>
      </div>
      <div className="floating-success">
        <span>✓</span>
        <div>
          작은 시작, 큰 가능성<small>한 줄씩 나의 것으로</small>
        </div>
      </div>
    </div>
  );
}

function ContentError({ message }: { message: string }) {
  return (
    <div className="empty">
      <h2>콘텐츠를 불러오지 못했어요</h2>
      <p>{message}</p>
      <button className="button secondary" onClick={() => location.reload()}>
        다시 시도
      </button>
    </div>
  );
}

function LessonView({
  lesson,
  lessons,
  completed,
  user,
  onCompletionChange,
}: {
  lesson: LessonDetail;
  lessons: LessonSummary[];
  completed: string[];
  user: User | null;
  onCompletionChange: (slug: string, completed: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  return (
    <div className="lesson-layout">
      <aside className="lesson-nav">
        <span className="eyebrow">C++ 기초 과정</span>
        {lessons.map((item, itemIndex) => (
          <Link
            className={item.slug === lesson.slug ? "selected" : ""}
            href={"/learn/" + item.slug}
            key={item.slug}
          >
            <span>{String(itemIndex + 1).padStart(2, "0")}</span>
            {item.title}
            {completed.includes(item.slug) && <Check size={14} />}
          </Link>
        ))}
      </aside>
      <article className="article">
        <Link className="breadcrumb" href="/learn">
          C++ 학습 / 기초 과정
        </Link>
        <h1>{lesson.title}</h1>
        <p className="article-intro">{lesson.summary}</p>
        <div className="article-meta">
          CHAPTER {String(lesson.order).padStart(2, "0")} · C++17
        </div>
        <section id="concept">
          <Markdown>{lesson.body}</Markdown>
        </section>
        <h2 id="practice">직접 풀어 보세요</h2>
        {lesson.problems.map((problem) => (
          <Link
            className="related-problem"
            key={problem.id}
            href={"/problems/" + problem.number}
          >
            <Code2 size={18} />
            <span>
              {problem.number}. {problem.title}
            </span>
            <span className="badge green">난이도 {problem.difficulty}</span>
            <ArrowRight size={16} />
          </Link>
        ))}
        {!lesson.problems.length && (
          <p className="small-muted">아직 연결된 공개 문제가 없습니다.</p>
        )}
        <div className="lesson-actions">
          <button
            className="button primary"
            onClick={async () => {
              if (!user) {
                router.push(
                  "/login?next=" + encodeURIComponent(`/learn/${lesson.slug}`),
                );
                return;
              }
              await onCompletionChange(
                lesson.slug,
                !completed.includes(lesson.slug),
              );
            }}
          >
            <Check size={16} />
            {completed.includes(lesson.slug)
              ? "학습 완료 취소"
              : "이 강의를 이해했어요"}
          </button>
          <div>
            {index > 0 && (
              <Link href={"/learn/" + lessons[index - 1].slug}>
                ← 이전 강의
              </Link>
            )}
            {index >= 0 && index < lessons.length - 1 && (
              <Link href={"/learn/" + lessons[index + 1].slug}>
                다음 강의 →
              </Link>
            )}
          </div>
        </div>
      </article>
      <aside className="toc">
        <span>이 강의에서</span>
        <a href="#concept">강의 내용</a>
        <a href="#practice">관련 문제</a>
      </aside>
    </div>
  );
}

function LearnerHome({
  user,
  lessons,
  problems,
  completed,
  solved,
  submissions,
  status,
}: {
  user: User;
  lessons: LessonSummary[];
  problems: ProblemSummary[];
  completed: string[];
  solved: Set<number>;
  submissions: SubmissionSummary[];
  status: (id: number) => string;
}) {
  const nextLesson = lessons.find((lesson) => !completed.includes(lesson.slug));
  const unsolved = problems.filter((problem) => !solved.has(problem.number));
  const recommended = unsolved.slice(0, 3);
  const progress = lessons.length
    ? Math.round((completed.length / lessons.length) * 100)
    : 0;
  const nextIndex = nextLesson ? lessons.indexOf(nextLesson) : -1;

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">MY LEARNING</span>
          <h1>{user.name}님, 이어서 학습해 볼까요?</h1>
          <p>완료한 내용은 정리하고, 지금 필요한 다음 학습만 준비했어요.</p>
        </div>
        <Link href="/me" className="dashboard-history-link">
          내 학습 기록 <ArrowUpRight size={16} />
        </Link>
      </div>

      <section className="continue-card" aria-labelledby="continue-title">
        <div className="continue-main">
          <span className="continue-kicker">
            {nextLesson ? "NEXT LESSON" : "COURSE COMPLETE"}
          </span>
          <h2 id="continue-title">
            {nextLesson ? nextLesson.title : "기초 과정을 모두 마쳤어요"}
          </h2>
          <p>
            {nextLesson
              ? nextLesson.summary
              : "이제 해결하지 않은 문제에 도전하며 배운 내용을 단단하게 만들어 보세요."}
          </p>
          <div className="continue-meta">
            {nextLesson ? (
              <>
                <span>CHAPTER {String(nextIndex + 1).padStart(2, "0")}</span>
                <span>데이터베이스 공개 강의</span>
              </>
            ) : (
              <span>미해결 문제 {unsolved.length}개</span>
            )}
          </div>
          <A href={nextLesson ? `/learn/${nextLesson.slug}` : "/problems"}>
            {nextLesson ? "계속 학습하기" : "문제에 도전하기"}
          </A>
        </div>
        <div className="progress-panel">
          <div className="progress-copy">
            <span>기초 과정 진도</span>
            <strong>{progress}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="기초 과정 진도"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>
            {completed.length} / {lessons.length}개 강의
          </p>
          <div className="dashboard-mini-stats">
            <div>
              <strong>{solved.size}</strong>
              <span>해결한 문제</span>
            </div>
            <div>
              <strong>{submissions.length}</strong>
              <span>제출한 풀이</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-problems">
        <SectionTitle
          title={
            recommended.length
              ? "다음으로 풀어볼 문제"
              : "모든 문제를 해결했어요"
          }
          sub={
            recommended.length
              ? "아직 해결하지 않은 문제를 모았어요."
              : "대단해요. 학습 기록에서 지나온 풀이를 복습해 보세요."
          }
          href={recommended.length ? "/problems" : "/me"}
        />
        {recommended.length ? (
          <ProblemTable items={recommended} status={status} />
        ) : (
          <div className="dashboard-empty">
            <Check size={22} />
            <p>새로운 문제가 추가되기 전까지 이전 풀이를 다시 살펴보세요.</p>
            <A href="/me" secondary>
              학습 기록 보기
            </A>
          </div>
        )}
      </section>
    </>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="eyebrow">{eyebrow}</div>
      <div className="page-heading compact">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
    </>
  );
}
function SectionTitle({
  title,
  sub,
  href,
}: {
  title: string;
  sub: string;
  href?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {href && (
        <Link href={href}>
          전체 보기 <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  unit,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  note: string;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <div className="stat-value">
          {value}
          <small>{unit}</small>
        </div>
        <p>{note}</p>
      </div>
    </div>
  );
}
function ProblemTable({
  items,
  status,
}: {
  items: ProblemSummary[];
  status: (id: number) => string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>문제</th>
            <th>난이도</th>
            <th>유형</th>
            <th>내 상태</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="muted">{p.number}</td>
              <td>
                <Link className="problem-link" href={"/problems/" + p.number}>
                  {p.title}
                  <ArrowUpRight size={14} />
                </Link>
              </td>
              <td>
                <span className={"difficulty level-" + p.difficulty}>
                  {"★".repeat(p.difficulty)}
                  <span> 단계 {p.difficulty}</span>
                </span>
              </td>
              <td>
                <span className="tag">
                  {p.categories.map((category) => category.name).join(", ") ||
                    "미분류"}
                </span>
              </td>
              <td>
                <span
                  className={
                    status(p.number) === "해결" ? "green-text" : "muted"
                  }
                >
                  {status(p.number) === "해결" ? "✓ " : ""}
                  {status(p.number)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ProblemList({
  problems,
  categories,
  status,
}: {
  problems: ProblemSummary[];
  categories: ProblemCategory[];
  status: (id: number) => string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(""),
    [level, setLevel] = useState(""),
    [category, setCategory] = useState(""),
    [state, setState] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    const sync = () => {
      const p = new URLSearchParams(location.search);
      setQ(p.get("q") || "");
      setLevel(p.get("level") || "");
      setCategory(p.get("category") || "");
      setState(p.get("state") || "");
      setPage(Math.max(1, Number(p.get("page")) || 1));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function update(v: {
    q?: string;
    level?: string;
    category?: string;
    state?: string;
    page?: number;
  }) {
    const n = { q, level, category, state, page: 1, ...v };
    setQ(n.q);
    setLevel(n.level);
    setCategory(n.category);
    setState(n.state);
    setPage(n.page);
    const p = new URLSearchParams();
    Object.entries(n).forEach(([k, value]) => {
      if (value && !(k === "page" && value === 1)) p.set(k, String(value));
    });
    router.replace("/problems" + (p.size ? "?" + p : ""), { scroll: false });
  }
  const filtered = problems.filter(
    (p) =>
      `${p.number} ${p.title}`.toLowerCase().includes(q.toLowerCase()) &&
      (!level || p.difficulty === +level) &&
      (!category || p.categories.some((item) => item.slug === category)) &&
      (!state ||
        (state === "미해결"
          ? status(p.number) !== "해결"
          : status(p.number) === state)),
  );
  const maxPage = Math.max(1, Math.ceil(filtered.length / 5));
  const safePage = Math.min(page, maxPage);
  return (
    <>
      <PageTitle
        eyebrow="PRACTICE MAKES PROGRESS"
        title="문제 탐색"
        description="아는 것을 할 수 있는 것으로. 나에게 맞는 문제로 시작해 보세요."
      />
      <div className="filter-panel">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="문제 번호 또는 제목"
            placeholder="문제 번호 또는 제목으로 검색"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </label>
        <select
          aria-label="난이도"
          value={level}
          onChange={(e) => update({ level: e.target.value })}
        >
          <option value="">모든 난이도</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              단계 {n}
            </option>
          ))}
        </select>
        <select
          aria-label="유형"
          value={category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="">모든 유형</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="내 상태"
          value={state}
          onChange={(e) => update({ state: e.target.value })}
        >
          <option value="">모든 상태</option>
          {["해결", "시도 중", "미시도", "미해결"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="list-caption">
        <span>
          총 <strong>{filtered.length}</strong>개의 문제
        </span>
        <button
          className="text-button"
          onClick={() => update({ q: "", level: "", category: "", state: "" })}
        >
          필터 초기화
        </button>
      </div>
      {filtered.length ? (
        <ProblemTable
          items={filtered.slice((safePage - 1) * 5, safePage * 5)}
          status={status}
        />
      ) : (
        <div className="empty">
          <Search />
          <h2>검색 결과가 없어요</h2>
          <p>다른 검색어나 필터로 다시 찾아보세요.</p>
        </div>
      )}
      <div className="pagination">
        <button
          disabled={safePage <= 1}
          onClick={() => update({ page: safePage - 1 })}
        >
          ← 이전
        </button>
        <span>
          {safePage} / {maxPage}
        </span>
        <button
          disabled={safePage >= maxPage}
          onClick={() => update({ page: safePage + 1 })}
        >
          다음 →
        </button>
      </div>
    </>
  );
}
function HighlightedCode({ code }: { code: string }) {
  return (
    <pre className="highlighted-code">
      <code>
        {code
          .split(
            /("(?:[^"\\]|\\.)*"|\b(?:int|return|for|if|else|using|namespace|long|double|include)\b|\/\/[^\n]*)/g,
          )
          .map((t, i) => (
            <span
              key={i}
              className={
                t.startsWith('"')
                  ? "code-yellow"
                  : t.startsWith("//")
                    ? "muted-code"
                    : /^(int|return|for|if|else|using|namespace|long|double|include)$/.test(
                          t,
                        )
                      ? "code-purple"
                      : ""
              }
            >
              {t}
            </span>
          ))}
      </code>
    </pre>
  );
}
function LoginPrompt({ path }: { path: string }) {
  return (
    <div className="empty">
      <GraduationCap size={40} />
      <h1>나만의 학습을 시작해 볼까요?</h1>
      <p>로그인하면 코드 초안과 제출 기록을 저장할 수 있어요.</p>
      <A href={"/login?next=" + encodeURIComponent(path)}>로그인하기</A>
    </div>
  );
}
function NotFound() {
  return (
    <div className="empty">
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소를 확인하거나 홈에서 다시 시작해 주세요.</p>
      <A href="/">홈으로 이동</A>
    </div>
  );
}
function Auth({
  registerMode,
  onSignIn,
}: {
  registerMode: boolean;
  onSignIn: (input: {
    register: boolean;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [submitting, setSubmitting] = useState(false);
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow">ONE LINE AT A TIME</div>
        <h1>
          오늘의 한 줄이
          <br />
          내일의 실력으로.
        </h1>
        <p>
          처음의 막막함부터 해결의 기쁨까지,
          <br />
          CppStudy가 함께할게요.
        </p>
        <div className="auth-symbol">
          {"{"}
          <Code2 size={66} />
          {"}"}
        </div>
      </div>
      <form
        className="auth-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setSubmitting(true);
          try {
            await onSignIn({
              register: registerMode,
              email: email.trim().toLowerCase(),
              name: name.trim(),
              password,
            });
          } catch (caught) {
            setError(
              caught instanceof ApiError
                ? caught.message
                : "인증 요청을 처리하지 못했습니다.",
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <h2>{registerMode ? "학습의 첫걸음" : "다시 만나 반가워요"}</h2>
        <p>
          {registerMode
            ? "계정을 만들고 학습을 시작하세요."
            : "이메일과 비밀번호로 로그인하세요."}
        </p>
        <div className="auth-note">
          로그인 세션은 보안 쿠키로 유지되며 비밀번호는 화면에 저장하지
          않습니다.
        </div>
        {registerMode && (
          <label>
            닉네임
            <input
              required
              minLength={2}
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="어떻게 불러 드릴까요?"
            />
          </label>
        )}
        <label>
          이메일
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="learner@example.com"
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            autoComplete={registerMode ? "new-password" : "current-password"}
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="10자 이상"
          />
        </label>
        {error && <div className="auth-note">{error}</div>}
        <button
          className="button primary full"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "처리 중…" : registerMode ? "계정 만들기" : "로그인"}
          <ArrowRight size={16} />
        </button>
        <p className="auth-switch">
          {registerMode ? "이미 계정이 있나요?" : "처음 오셨나요?"}{" "}
          <Link href={registerMode ? "/login" : "/register"}>
            {registerMode ? "로그인" : "회원가입"}
          </Link>
        </p>
      </form>
    </div>
  );
}
function SubmissionTable({ items }: { items: SubmissionSummary[] }) {
  return items.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>문제</th>
            <th>판정</th>
            <th>언어</th>
            <th>제출 시각</th>
            <th>기록</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={"/problems/" + s.problem.number}>
                  {s.problem.number}. {s.problem.title}
                </Link>
              </td>
              <td>
                <Badge status={s.status} />
              </td>
              <td>C++17</td>
              <td>{new Date(s.createdAt).toLocaleString("ko-KR")}</td>
              <td>
                <Link className="green-text" href={"/submissions/" + s.id}>
                  소스 보기 ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      <FileCode2 size={30} />
      <h2>아직 제출한 풀이가 없어요</h2>
      <p>첫 문제를 풀고 나만의 학습 기록을 남겨 보세요.</p>
      <A href="/problems">문제 둘러보기</A>
    </div>
  );
}
function Workspace({
  problem: p,
  user,
  submissions,
  onSubmissionFinished,
  notify,
}: {
  problem: ProblemDetail;
  user: User | null;
  submissions: SubmissionSummary[];
  onSubmissionFinished: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const router = useRouter();
  const version = p.currentVersion;
  const example = version.testCases[0];
  const category = p.categories.map((item) => item.name).join(", ") || "미분류";
  const relatedLesson = p.lessons[0];
  const draftKey = `cppstudy:draft:${user?.email}:${p.number}:cpp17`;
  const [code, setCode] = useState(version.starterCode),
    [loaded, setLoaded] = useState(false),
    [saveState, setSaveState] = useState(""),
    [input, setInput] = useState(example?.input ?? ""),
    [runResult, setRunResult] = useState<RunResult | null>(null),
    [submissionResult, setSubmissionResult] = useState<SubmissionDetail | null>(
      null,
    ),
    [busy, setBusy] = useState<"run" | "submission" | null>(null),
    [tab, setTab] = useState("problem"),
    [font, setFont] = useState(14),
    [split, setSplit] = useState(45),
    [reset, setReset] = useState(false);
  const latest = submissions.find((s) => s.problem.number === p.number),
    visibleSubmission = submissionResult ?? latest,
    pending =
      visibleSubmission && processingStatuses.has(visibleSubmission.status);
  useEffect(() => {
    const existing = user ? read<string | null>(draftKey, null) : null;
    setCode(existing ?? version.starterCode);
    setSaveState(
      existing !== null
        ? "저장된 초안을 복원했어요"
        : user
          ? "자동 저장 준비"
          : "로그인 후 초안 저장",
    );
    setLoaded(true);
  }, [draftKey, user, version.starterCode]);
  useEffect(() => {
    if (!loaded || !user) return;
    const stored = save(draftKey, code);
    setSaveState((previous) =>
      stored
        ? previous === "저장된 초안을 복원했어요"
          ? previous
          : "초안 저장됨"
        : "저장 실패 · 브라우저 저장 공간을 확인하세요",
    );
  }, [code, draftKey, loaded, user]);
  useEffect(() => {
    if (!latest || !processingStatuses.has(latest.status)) return;
    let active = true;
    pollUntilFinished(() => getSubmission(latest.id))
      .then(async (result) => {
        if (!active) return;
        setSubmissionResult(result);
        await onSubmissionFinished();
      })
      .catch((error) => {
        if (active)
          notify(
            error instanceof ApiError
              ? error.message
              : "제출 상태를 갱신하지 못했습니다.",
          );
      });
    return () => {
      active = false;
    };
  }, [latest?.id, latest?.status]);
  const requireUser = () => {
    if (user) return true;
    router.push("/login?next=" + encodeURIComponent("/problems/" + p.number));
    return false;
  };
  async function executeCode() {
    if (!requireUser() || busy) return;
    setBusy("run");
    setRunResult(null);
    setTab("result");
    try {
      const accepted = await createRun({
        problemVersionId: version.id,
        language: "CPP17",
        sourceCode: code,
        stdin: input,
      });
      setRunResult(await pollUntilFinished(() => getRun(accepted.runId)));
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : "실행 요청에 실패했습니다.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function submitCode() {
    if (!requireUser() || busy || pending || !code.trim()) return;
    setBusy("submission");
    setSubmissionResult(null);
    setTab("result");
    try {
      const accepted = await createSubmission(
        {
          problemVersionId: version.id,
          language: "CPP17",
          sourceCode: code,
        },
        crypto.randomUUID(),
      );
      const result = await pollUntilFinished(() =>
        getSubmission(accepted.submissionId),
      );
      setSubmissionResult(result);
      await onSubmissionFinished();
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : "제출 요청에 실패했습니다.",
      );
    } finally {
      setBusy(null);
    }
  }
  const runOutput = runResult
    ? [
        `${runResult.status} · C++17 실행 결과`,
        runResult.compileOutput ? `\ncompile\n${runResult.compileOutput}` : "",
        `\nstdout\n${runResult.stdout || "없음"}`,
        `\nstderr\n${runResult.stderr || "없음"}`,
        `\n${runResult.executionTimeMs ?? "측정 없음"} ms · ${runResult.memoryUsageKiB ?? "측정 없음"} KiB`,
      ].join("")
    : busy === "run"
      ? "실행 요청을 처리하고 있습니다…"
      : "실행 버튼을 누르면 서버에서 C++17 코드를 컴파일하고 실행합니다.";
  return (
    <>
      <div className="workspace-title">
        <div>
          <Link className="breadcrumb" href="/problems">
            문제 탐색 / {category}
          </Link>
          <h1>
            <span>{p.number}.</span> {p.title}
          </h1>
          <div className="problem-meta">
            <span className="badge green">
              {"★".repeat(p.difficulty)} 단계 {p.difficulty}
            </span>
            <span>{category}</span>
            <span>문제 v{version.version}</span>
            <span>{version.timeLimitMs.toLocaleString()} ms</span>
            <span>{Math.round(version.memoryLimitKiB / 1024)} MiB</span>
          </div>
        </div>
        <Link className="button secondary" href="/me/submissions">
          제출 기록 <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="workspace-notice">
        제출 코드는 격리된 실행 환경에서 네트워크 없이 컴파일됩니다. 실행 결과와
        테스트 판정은 서버에 기록됩니다.
      </div>
      <div className="workspace-controls">
        <div className="mobile-tabs">
          {[
            ["problem", "문제"],
            ["code", "코드"],
            ["result", "결과"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="split-control">
          화면 분할{" "}
          <input
            aria-label="화면 분할 비율"
            type="range"
            min="30"
            max="60"
            value={split}
            onChange={(e) => setSplit(+e.target.value)}
          />
        </label>
      </div>
      <div
        className={"workspace mobile-" + tab}
        style={{
          gridTemplateColumns: `minmax(0,${split}fr) minmax(0,${100 - split}fr)`,
        }}
      >
        <section className="problem-pane">
          <div className="pane-heading">
            <BookOpen size={16} /> 문제 설명
          </div>
          <div className="problem-body">
            <h2>문제</h2>
            <Markdown>{version.statement}</Markdown>
            <h2>입력</h2>
            <Markdown>{version.inputDescription}</Markdown>
            <h2>출력</h2>
            <Markdown>{version.outputDescription}</Markdown>
            <h2>제약 조건</h2>
            <Markdown>{version.constraints}</Markdown>
            <h2>예제</h2>
            <div className="sample-pair">
              <div>
                <div className="sample-label">
                  입력
                  <CopyCode code={example?.input ?? ""} />
                </div>
                <pre>{example?.input || "(입력 없음)"}</pre>
              </div>
              <div>
                <div className="sample-label">
                  출력
                  <CopyCode code={example?.expectedOutput ?? ""} />
                </div>
                <pre>{example?.expectedOutput ?? ""}</pre>
              </div>
            </div>
            <p className="small-muted">
              {version.comparator} 비교 방식이 적용됩니다.
            </p>
            {relatedLesson && (
              <Link
                className="related-problem"
                href={"/learn/" + relatedLesson.slug}
              >
                <BookOpen size={17} />
                <span>관련 강의: {relatedLesson.title}</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </section>
        <section className="editor-pane">
          <div className="pane-heading">
            <FileCode2 size={16} />
            <span>main.cpp</span>
            <span className="editor-language">C++17</span>
            <label>
              글자{" "}
              <select
                aria-label="에디터 글자 크기"
                value={font}
                onChange={(e) => setFont(+e.target.value)}
              >
                {[12, 14, 16, 18].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="editor-container">
            {loaded && (
              <CodeEditor
                value={code}
                onChange={(v) => {
                  setCode(v ?? "");
                  if (user) setSaveState("초안 저장됨");
                }}
                fontSize={font}
              />
            )}
          </div>
          <div className="editor-toolbar">
            <span className="small-muted">{saveState}</span>
            <button className="text-button" onClick={() => setReset(true)}>
              초기화
            </button>
          </div>
          <div className="submit-tools">
            <button
              className="button secondary"
              disabled={!!busy || !code.trim()}
              onClick={executeCode}
            >
              <Play size={15} />
              {busy === "run" ? "실행 중" : "실행"}
            </button>
            <button
              className="button primary"
              disabled={!!busy || !!pending || !code.trim()}
              onClick={submitCode}
            >
              {busy === "submission" ? "제출 중" : "제출"}
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <section className="results-pane">
          <div className="result-columns">
            <div>
              <div className="result-heading">
                <Terminal size={16} />
                <h3>실행 입력 및 결과</h3>
                <button
                  className="text-button"
                  onClick={() => setInput(example?.input ?? "")}
                >
                  예제 입력 선택
                </button>
              </div>
              <label className="sr-only" htmlFor="stdin">
                사용자 입력
              </label>
              <textarea
                id="stdin"
                className="stdin"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="표준 입력을 작성하세요"
              />
              <pre
                className={
                  "run-output" +
                  (runResult && failureStatuses.has(runResult.status)
                    ? " error"
                    : "")
                }
                aria-live="polite"
              >
                {runOutput}
              </pre>
            </div>
            <div>
              <div className="result-heading">
                <ListChecks size={16} />
                <h3>제출 결과</h3>
              </div>
              {visibleSubmission ? (
                <div
                  className={
                    "submission-result" +
                    (failureStatuses.has(visibleSubmission.status)
                      ? " error"
                      : "")
                  }
                  aria-live="polite"
                >
                  <Badge status={visibleSubmission.status} />
                  <p>
                    {visibleSubmission.status === "AC"
                      ? "모든 테스트를 통과했습니다."
                      : visibleSubmission.status === "WA"
                        ? "출력 비교에서 일치하지 않았습니다."
                        : verdicts[visibleSubmission.status]}
                  </p>
                  <span className="small-muted">
                    테스트 {visibleSubmission.passedCount}/
                    {visibleSubmission.totalCount} ·{" "}
                    {visibleSubmission.executionTimeMs ?? "측정 없음"} ms ·{" "}
                    {visibleSubmission.memoryUsageKiB ?? "측정 없음"} KiB
                  </span>
                  <Link href={"/submissions/" + visibleSubmission.id}>
                    제출 소스와 상세 보기 <ArrowUpRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="result-empty">
                  제출한 풀이가 아직 없어요.
                  <br />
                  <small>코드를 제출하면 서버 기록이 여기에 표시됩니다.</small>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      {reset && (
        <ConfirmDialog titleId="reset-title" onClose={() => setReset(false)}>
          <h2 id="reset-title">코드를 초기화할까요?</h2>
          <p>현재 작성한 코드가 기본 코드로 바뀝니다.</p>
          <div className="actions">
            <button
              autoFocus
              className="button secondary"
              onClick={() => setReset(false)}
            >
              취소
            </button>
            <button
              className="button primary"
              onClick={() => {
                setCode(version.starterCode);
                setReset(false);
                notify("기본 코드로 초기화했습니다.");
              }}
            >
              초기화
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
