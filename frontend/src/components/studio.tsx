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
import {
  lessons,
  problems,
  starter,
  verdicts,
  resolveSubmission,
  type Submission,
  type Problem,
} from "@/lib/data";
const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">코드 에디터를 불러오는 중…</div>
  ),
});
type User = { email: string; name: string; role: "USER" | "ADMIN" };
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
function Badge({ status }: { status: string }) {
  return (
    <span
      className={
        "badge " +
        (status === "AC"
          ? "green"
          : status === "PENDING" || status === "JUDGING"
            ? "amber"
            : "gray")
      }
    >
      {verdicts[status] || status}
    </span>
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
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [completed, setCompleted] = useState<string[]>([]),
    [toast, setToast] = useState("");
  useEffect(() => {
    setUser(read("cppstudy:user", null));
    setSubmissions(
      read<Submission[]>("cppstudy:submissions", []).map(resolveSubmission),
    );
    setReady(true);
  }, []);
  useEffect(() => {
    setCompleted(user ? read("cppstudy:completed:" + user.email, []) : []);
  }, [user]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(
      () =>
        setSubmissions((old) => {
          if (!old.some((s) => ["PENDING", "JUDGING"].includes(s.status)))
            return old;
          const next = old.map(resolveSubmission);
          save("cppstudy:submissions", next);
          return next;
        }),
      250,
    );
    return () => clearInterval(t);
  }, [ready]);
  const mine = submissions.filter((s) => s.user === user?.email),
    solved = new Set(
      mine.filter((s) => s.status === "AC").map((s) => s.problemId),
    );
  const status = (id: number) =>
    solved.has(id)
      ? "해결"
      : mine.some(
            (s) =>
              s.problemId === id &&
              !["PENDING", "JUDGING", "SYSTEM_ERROR"].includes(s.status),
          )
        ? "시도 중"
        : "미시도";
  const notify = (message: string) => setToast(message);
  const signOut = () => {
    if (user) {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("cppstudy:draft:" + user.email + ":"))
          .forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem("cppstudy:user");
      } catch {}
    }
    setUser(null);
    router.push("/");
    notify("로그아웃했어요. 이 계정의 코드 초안도 정리했습니다.");
  };
  function signIn(next: User) {
    setUser(next);
    save("cppstudy:user", next);
    const target = new URLSearchParams(location.search).get("next");
    router.push(
      target && target.startsWith("/") && !target.startsWith("//")
        ? target
        : "/me",
    );
    notify("데모 프로필로 시작합니다.");
  }
  function submit(p: Problem, code: string, target: string) {
    if (!user) return;
    const row: Submission = {
      id: crypto.randomUUID(),
      user: user.email,
      problemId: p.id,
      title: p.title,
      code,
      status: "PENDING",
      created: new Date().toISOString(),
      finishedAt: Date.now() + 1500,
      target,
    };
    setSubmissions((old) => {
      const next = [row, ...old];
      if (!save("cppstudy:submissions", next))
        notify(
          "저장 공간이 부족합니다. 이번 기록은 새로고침하면 사라질 수 있어요.",
        );
      return next;
    });
    return row.id;
  }
  const parts = path.split("/").filter(Boolean);
  let content: ReactNode;
  if (!ready)
    content = <div className="loading">학습 공간을 준비하고 있어요…</div>;
  else if (path === "/")
    content = (
      <>
        <div className="eyebrow">YOUR C++ LEARNING SPACE</div>
        <div className="page-heading">
          <div>
            <h1>
              작은 이해가 모여,
              <br />
              단단한 실력이 됩니다<span className="green-text">.</span>
            </h1>
            <p>개념을 배우고, 직접 풀어 보세요. 오늘도 한 걸음 더.</p>
          </div>
          <span className="semester">C++17 · 처음부터 차근차근</span>
        </div>
        <section className="hero">
          <div>
            <span className="hero-label">
              <span className="dot" /> LEARN BY DOING
            </span>
            <h2>
              코드로 이해하는 C++,
              <br />
              나만의 속도로 시작해요.
            </h2>
            <p>
              한눈에 읽히는 개념 정리부터 첫 문제 해결까지.
              <br />
              당신의 배움을 하나의 흐름으로 연결합니다.
            </p>
            <A href="/learn/io">첫 강의 시작하기</A>
            <Link className="hero-link" href="/problems">
              문제 먼저 둘러보기 <ArrowUpRight size={15} />
            </Link>
          </div>
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
              <span>첫 번째 가능성이 실행됐어요</span>
            </div>
            <div className="floating-success">
              <span>✓</span>
              <div>
                작은 시작, 큰 가능성<small>한 줄씩 나의 것으로</small>
              </div>
            </div>
          </div>
        </section>
        <div className="stats">
          <Stat
            icon={<BookOpen />}
            label="완료한 강의"
            value={`${completed.length}`}
            unit={`/ ${lessons.length}개`}
            note="개념을 차곡차곡"
          />
          <Stat
            icon={<Code2 />}
            label="해결한 문제"
            value={`${solved.size}`}
            unit={`/ ${problems.length}개`}
            note="직접 풀며 쌓는 실력"
          />
          <Stat
            icon={<ListChecks />}
            label="제출한 풀이"
            value={`${mine.length}`}
            unit="회"
            note="모든 시도가 배움의 기록"
          />
        </div>
        <div className="home-bottom">
          <section>
            <SectionTitle
              title="오늘의 학습 한 걸음"
              sub="기초부터 하나씩, 자신 있게"
              href="/learn"
            />
            <div className="learning-card">
              <div className="chapter-icon">
                <BookOpen size={29} />
              </div>
              <div>
                <span className="eyebrow">CHAPTER 01 · BEGINNER</span>
                <h3>시작과 입출력</h3>
                <p>main, cin, cout — 첫 프로그램을 만들어 봐요.</p>
                <span className="small-muted">12분 학습 · 연결 문제 2개</span>
              </div>
              <Link
                href="/learn/io"
                className="round-arrow"
                aria-label="시작과 입출력 강의 열기"
              >
                <ArrowRight size={20} />
              </Link>
            </div>
            <SectionTitle
              title="직접 풀어 볼까요?"
              sub="방금 배운 개념을 코드로 바꾸는 시간"
              href="/problems"
            />
            <ProblemTable items={problems.slice(0, 3)} status={status} />
          </section>
          <aside className="journey">
            <span className="eyebrow">THE LEARNING LOOP</span>
            <h3>배움이 실력이 되는 과정</h3>
            {[
              ["01", "개념 이해하기", "핵심 설명과 예제로 감 잡기"],
              ["02", "직접 코드 작성하기", "관련 문제로 개념을 내 것으로"],
              ["03", "기록하며 성장하기", "풀이를 돌아보고 다시 도전하기"],
            ].map(([n, t, d]) => (
              <div className="journey-step" key={n}>
                <span>{n}</span>
                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </div>
            ))}
            <div className="journey-note">
              빠르게보다, 꾸준하게.
              <br />한 문제의 이해가 다음 문제의 힘이 돼요.
            </div>
          </aside>
        </div>
      </>
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
          <GraduationCap size={20} /> 공개 샘플 강의 6개 · 약 115분{" "}
          <span>나머지 교육 과정은 콘텐츠 확장 예정</span>
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
              <p>{l.sub}</p>
              <div className="card-footer">
                <span>
                  {l.minutes}분 ·{" "}
                  {problems.filter((p) => p.lesson === l.slug).length}개 문제
                </span>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  else if (parts[0] === "learn" && parts[1]) {
    const l = lessons.find((l) => l.slug === parts[1]);
    content = l ? (
      <div className="lesson-layout">
        <aside className="lesson-nav">
          <span className="eyebrow">C++ 기초 과정</span>
          {lessons.map((item, i) => (
            <Link
              className={item.slug === l.slug ? "selected" : ""}
              href={"/learn/" + item.slug}
              key={item.slug}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {item.title}
              {completed.includes(item.slug) && <Check size={14} />}
            </Link>
          ))}
        </aside>
        <article className="article">
          <Link className="breadcrumb" href="/learn">
            C++ 학습 / 기초 과정
          </Link>
          <h1>{l.title}</h1>
          <p className="article-intro">{l.sub}</p>
          <div className="article-meta">
            약 {l.minutes}분 · C++17 · 선행: {l.prerequisite}
          </div>
          <h2 id="goal">학습 목표</h2>
          <p>{l.title}의 기본 동작을 이해하고 예제를 설명할 수 있습니다.</p>
          <h2 id="concept">개념 이해하기</h2>
          <Markdown>{l.explanation}</Markdown>
          <h2 id="example">코드로 살펴보기</h2>
          <div className="code-block">
            <div>
              <span>example.cpp · C++17</span>
              <CopyCode code={l.code} />
            </div>
            <HighlightedCode code={l.code} />
          </div>
          <pre className="sample">{l.result}</pre>
          <div className="tip">
            <strong>자주 하는 실수</strong>
            <p>{l.mistake}</p>
          </div>
          <h2>핵심 요약</h2>
          <p>{l.explanation.split(". ")[0]}.</p>
          <h2 id="practice">직접 풀어 보세요</h2>
          {problems
            .filter((p) => p.lesson === l.slug)
            .map((p) => (
              <Link
                className="related-problem"
                key={p.id}
                href={"/problems/" + p.id}
              >
                <Code2 size={18} />
                <span>
                  {p.id}. {p.title}
                </span>
                <span className="badge green">난이도 {p.level}</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          {!problems.some((p) => p.lesson === l.slug) && (
            <A href="/problems/1005" secondary>
              자료형을 활용하는 합계 문제
            </A>
          )}
          <div className="lesson-actions">
            <button
              className="button primary"
              onClick={() => {
                if (!user) {
                  router.push("/login?next=" + path);
                  return;
                }
                const next = completed.includes(l.slug)
                  ? completed.filter((x) => x !== l.slug)
                  : [...completed, l.slug];
                setCompleted(next);
                save("cppstudy:completed:" + user.email, next);
              }}
            >
              <Check size={16} />
              {completed.includes(l.slug)
                ? "학습 완료 취소"
                : "이 강의를 이해했어요"}
            </button>
            <div>
              {lessons.indexOf(l) > 0 && (
                <Link href={"/learn/" + lessons[lessons.indexOf(l) - 1].slug}>
                  ← 이전 강의
                </Link>
              )}
              {lessons.indexOf(l) < lessons.length - 1 && (
                <Link href={"/learn/" + lessons[lessons.indexOf(l) + 1].slug}>
                  다음 강의 →
                </Link>
              )}
            </div>
          </div>
        </article>
        <aside className="toc">
          <span>이 강의에서</span>
          <a href="#goal">학습 목표</a>
          <a href="#concept">개념 이해하기</a>
          <a href="#example">코드로 살펴보기</a>
          <a href="#practice">관련 문제</a>
        </aside>
      </div>
    ) : (
      <NotFound />
    );
  } else if (path === "/problems") content = <ProblemList status={status} />;
  else if (parts[0] === "problems" && parts[1]) {
    const p = problems.find((p) => p.id === Number(parts[1]));
    content = p ? (
      <Workspace
        key={`${p.id}:${user?.email || "guest"}`}
        problem={p}
        user={user}
        onSubmit={submit}
        submissions={mine}
        notify={notify}
      />
    ) : (
      <NotFound />
    );
  } else if (path === "/login" || path === "/register")
    content = <Auth register={path === "/register"} onSignIn={signIn} />;
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
            note="모의 AC 기록 기준"
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
    const s = mine.find((s) => s.id === parts[1]);
    content = !user ? (
      <LoginPrompt path={path} />
    ) : s ? (
      <>
        <PageTitle
          eyebrow="SUBMISSION DETAIL"
          title={`${s.problemId}. ${s.title}`}
          description="제출 시점에 저장된 소스입니다. 이후 편집한 초안과 별개로 보관됩니다."
        />
        <section className="submission-summary">
          <Badge status={s.status} />
          <span>{new Date(s.created).toLocaleString("ko-KR")}</span>
          <span>C++17 · 문제 v1</span>
          <span>시간 · 메모리: 측정 없음</span>
        </section>
        <div className="info-strip">
          모의 판정 · 실제 컴파일 환경 및 숨김 테스트는 연결되지 않았습니다.
        </div>
        <div className="code-block">
          <div>
            <span>제출 소스 · main.cpp</span>
            <CopyCode code={s.code} />
          </div>
          <HighlightedCode code={s.code} />
        </div>
        <div className="actions">
          <A href={"/problems/" + s.problemId}>다시 풀기</A>
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
        <h2>관리자 데모 프로필이 필요해요</h2>
        <p>로그아웃 후 로그인 화면의 관리자 데모를 선택하세요.</p>
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
      <div className="prototype-strip">
        <span className="dot" /> 프론트엔드 프로토타입{" "}
        <span className="strip-divider">|</span> 인증·실행·채점은 데모이며,
        데이터는 이 브라우저에 저장됩니다.
      </div>
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
  items: Problem[];
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
              <td className="muted">{p.id}</td>
              <td>
                <Link className="problem-link" href={"/problems/" + p.id}>
                  {p.title}
                  <ArrowUpRight size={14} />
                </Link>
              </td>
              <td>
                <span className={"difficulty level-" + p.level}>
                  {"★".repeat(p.level)}
                  <span> 단계 {p.level}</span>
                </span>
              </td>
              <td>
                <span className="tag">{p.category}</span>
              </td>
              <td>
                <span
                  className={status(p.id) === "해결" ? "green-text" : "muted"}
                >
                  {status(p.id) === "해결" ? "✓ " : ""}
                  {status(p.id)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ProblemList({ status }: { status: (id: number) => string }) {
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
      `${p.id} ${p.title}`.toLowerCase().includes(q.toLowerCase()) &&
      (!level || p.level === +level) &&
      (!category || p.category === category) &&
      (!state ||
        (state === "미해결"
          ? status(p.id) !== "해결"
          : status(p.id) === state)),
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
          {[...new Set(problems.map((p) => p.category))].map((c) => (
            <option key={c}>{c}</option>
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
      <p>데모 프로필로 로그인하면 코드 초안과 제출 기록을 저장할 수 있어요.</p>
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
  register,
  onSignIn,
}: {
  register: boolean;
  onSignIn: (u: User) => void;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
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
        onSubmit={(e) => {
          e.preventDefault();
          onSignIn({
            email: email.trim().toLowerCase(),
            name: register ? name.trim() : email.split("@")[0],
            role: "USER",
          });
        }}
      >
        <h2>{register ? "학습의 첫걸음" : "다시 만나 반가워요"}</h2>
        <p>
          {register
            ? "새로운 데모 프로필로 시작하세요."
            : "이메일로 데모 학습 공간에 들어오세요."}
        </p>
        <div className="auth-note">
          실제 인증이 아닙니다. 비밀번호는 확인하거나 저장하지 않으니 테스트
          값만 입력하세요.
        </div>
        {register && (
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
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="learner@example.com"
          />
        </label>
        <label>
          테스트 비밀번호
          <input
            type="password"
            autoComplete="off"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="테스트용 8자 이상"
          />
        </label>
        <button className="button primary full" type="submit">
          {register ? "데모 프로필 만들기" : "데모 로그인"}
          <ArrowRight size={16} />
        </button>
        <div className="divider">빠르게 둘러보기</div>
        <div className="demo-buttons">
          <button
            type="button"
            onClick={() =>
              onSignIn({
                email: "learner@demo.local",
                name: "학습자",
                role: "USER",
              })
            }
          >
            학습자 데모
          </button>
          <button
            type="button"
            onClick={() =>
              onSignIn({
                email: "admin@demo.local",
                name: "관리자",
                role: "ADMIN",
              })
            }
          >
            관리자 데모
          </button>
        </div>
        <p className="auth-switch">
          {register ? "이미 프로필이 있나요?" : "처음 오셨나요?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "로그인" : "회원가입"}
          </Link>
        </p>
      </form>
    </div>
  );
}
function SubmissionTable({ items }: { items: Submission[] }) {
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
                <Link href={"/problems/" + s.problemId}>
                  {s.problemId}. {s.title}
                </Link>
              </td>
              <td>
                <Badge status={s.status} />
              </td>
              <td>C++17</td>
              <td>{new Date(s.created).toLocaleString("ko-KR")}</td>
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
  onSubmit,
  submissions,
  notify,
}: {
  problem: Problem;
  user: User | null;
  onSubmit: (p: Problem, code: string, target: string) => string | undefined;
  submissions: Submission[];
  notify: (s: string) => void;
}) {
  const router = useRouter(),
    draftKey = `cppstudy:draft:${user?.email}:${p.id}:cpp17`;
  const [code, setCode] = useState(starter),
    [loaded, setLoaded] = useState(false),
    [saveState, setSaveState] = useState(""),
    [input, setInput] = useState(p.sampleIn),
    [run, setRun] = useState(""),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState("AC"),
    [tab, setTab] = useState("problem"),
    [font, setFont] = useState(14),
    [split, setSplit] = useState(45),
    [reset, setReset] = useState(false);
  const latest = submissions.find((s) => s.problemId === p.id),
    pending = latest && ["PENDING", "JUDGING"].includes(latest.status);
  useEffect(() => {
    const existing = user ? read<string | null>(draftKey, null) : null;
    setCode(existing ?? starter);
    setSaveState(
      existing !== null
        ? "저장된 초안을 복원했어요"
        : user
          ? "자동 저장 준비"
          : "로그인 후 초안 저장",
    );
    setLoaded(true);
  }, [draftKey, user]);
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
  const requireUser = () => {
    if (user) return true;
    router.push("/login?next=" + encodeURIComponent("/problems/" + p.id));
    return false;
  };
  async function runDemo() {
    if (!requireUser() || busy) return;
    setBusy(true);
    setRun("실행 결과 예시를 불러오는 중…");
    await new Promise((r) => setTimeout(r, 650));
    setRun(
      input === p.sampleIn
        ? `SUCCESS · 예시 응답 (작성 코드 실행 아님)\n\nstdout\n${p.sampleOut}\n\nstderr\n없음\n\n실제 시간·메모리 측정 없음`
        : "사용자 입력을 받았습니다.\n\n이 프론트엔드에는 C++ 실행기가 없습니다.\n임의 입력의 stdout은 실행 서버 연결 후 표시됩니다.",
    );
    setBusy(false);
    setTab("result");
  }
  return (
    <>
      <div className="workspace-title">
        <div>
          <Link className="breadcrumb" href="/problems">
            문제 탐색 / {p.category}
          </Link>
          <h1>
            <span>{p.id}.</span> {p.title}
          </h1>
          <div className="problem-meta">
            <span className="badge green">
              {"★".repeat(p.level)} 단계 {p.level}
            </span>
            <span>{p.category}</span>
            <span>문제 v1</span>
            <span>1,000 ms</span>
            <span>128 MiB</span>
          </div>
        </div>
        <Link className="button secondary" href="/me/submissions">
          제출 기록 <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="workspace-notice">
        실행·제출 시뮬레이션입니다. 작성한 C++ 코드를 컴파일하거나 정답 여부를
        검사하지 않습니다.
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
            <p>{p.description}</p>
            <h2>입력</h2>
            <p>{p.input}</p>
            <h2>출력</h2>
            <p>{p.output}</p>
            <h2>제약 조건</h2>
            <p>{p.constraints}</p>
            <h2>예제</h2>
            <div className="sample-pair">
              <div>
                <div className="sample-label">
                  입력
                  <CopyCode code={p.sampleIn} />
                </div>
                <pre>{p.sampleIn || "(입력 없음)"}</pre>
              </div>
              <div>
                <div className="sample-label">
                  출력
                  <CopyCode code={p.sampleOut} />
                </div>
                <pre>{p.sampleOut}</pre>
              </div>
            </div>
            <p className="small-muted">
              TOKEN 비교 · 공백·줄바꿈 차이는 허용하며 토큰의 순서와 값은 같아야
              합니다.
            </p>
            <Link className="related-problem" href={"/learn/" + p.lesson}>
              <BookOpen size={17} />
              <span>
                관련 강의: {lessons.find((l) => l.slug === p.lesson)?.title}
              </span>
              <ArrowRight size={16} />
            </Link>
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
            <label>
              모의 판정
              <select
                aria-label="모의 판정"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {Object.entries(verdicts)
                  .filter(([k]) => !["PENDING", "JUDGING"].includes(k))
                  .map(([k, v]) => (
                    <option value={k} key={k}>
                      {k} · {v}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={busy}
              onClick={runDemo}
            >
              <Play size={15} />
              {busy ? "실행 중" : "예시 실행"}
            </button>
            <button
              className="button primary"
              disabled={!!pending || !code.trim()}
              onClick={() => {
                if (requireUser()) {
                  onSubmit(p, code, target);
                  setTab("result");
                }
              }}
            >
              모의 제출
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
                  onClick={() => setInput(p.sampleIn)}
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
              <pre className="run-output" aria-live="polite">
                {run ||
                  "예시 실행을 누르면 공개 예제의 응답 형식을 확인할 수 있습니다."}
              </pre>
            </div>
            <div>
              <div className="result-heading">
                <ListChecks size={16} />
                <h3>제출 결과</h3>
              </div>
              {latest ? (
                <div className="submission-result" aria-live="polite">
                  <Badge status={latest.status} />
                  <p>
                    {latest.status === "AC"
                      ? "선택한 정답 시나리오가 완료됐어요."
                      : latest.status === "WA"
                        ? "선택한 오답 시나리오입니다. 경계값과 출력 형식을 검토해 보세요."
                        : latest.status === "CE"
                          ? "선택한 컴파일 오류 시나리오입니다. 실제 컴파일 진단은 연결되지 않았습니다."
                          : verdicts[latest.status]}
                  </p>
                  <span className="small-muted">
                    실제 테스트 수 · 실행 시간 · 메모리: 측정 없음
                  </span>
                  <Link href={"/submissions/" + latest.id}>
                    제출 소스와 상세 보기 <ArrowUpRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="result-empty">
                  제출한 풀이가 아직 없어요.
                  <br />
                  <small>모의 판정을 선택하고 제출 흐름을 체험해 보세요.</small>
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
                setCode(starter);
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
