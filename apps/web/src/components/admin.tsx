"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  ApiError,
  archiveAdminLesson,
  archiveAdminProblem,
  createAdminLesson,
  createAdminLessonCategory,
  createAdminLessonVersion,
  createAdminInvitation,
  createAdminProblem,
  createAdminProblemVersion,
  getAdminLesson,
  getAdminProblem,
  getAdminProblemValidation,
  deleteAdminAsset,
  listAdminAssets,
  listAdminInvitations,
  mediaUrl,
  listAdminContent,
  publishAdminLesson,
  publishAdminProblemVersion,
  requestAdminProblemValidation,
  restoreAdminLesson,
  restoreAdminProblem,
  revokeAdminInvitation,
  setAdminLessonProblems,
  setAdminLessonCategoryStatus,
  setAdminProblemRelations,
  setAdminProblemTests,
  updateAdminLesson,
  updateAdminLessonCategory,
  updateAdminProblemVersion,
  uploadAdminAsset,
  type AdminContent,
  type AdminInvitation,
  type ContentAsset,
  type ContentStatus,
  type ValidationStatus,
} from "@/lib/api";
import { starter, starterC11 } from "@/lib/data";
import ConfirmDialog from "./confirm-dialog";
import Markdown from "./markdown";
import VisualMarkdownEditor from "./visual-markdown-editor";

type TestCase = {
  id: string;
  input: string;
  output: string;
  sample: boolean;
  explanation: string;
};

type ContentDraft = {
  id: string;
  versionId: string;
  kind: "문제" | "강의";
  status: ContentStatus;
  editable: boolean;
  title: string;
  body: string;
  slug: string;
  summary: string;
  order: string;
  number: string;
  input: string;
  output: string;
  constraints: string;
  level: string;
  time: string;
  memory: string;
  checker: "TOKEN" | "EXACT";
  starterCode: string;
  starterCodeC11: string;
  reference: string;
  tests: TestCase[];
  categoryIds: string[];
  lessonIds: string[];
  problemIds: string[];
  lessonCategoryId: string;
  validatedAt: string | null;
  validationStatus: ValidationStatus | null;
  validationDiagnostic: string | null;
};

const blank = (kind: "문제" | "강의" = "문제"): ContentDraft => ({
  id: "",
  versionId: "",
  kind,
  status: "DRAFT",
  editable: true,
  title: "",
  body: "",
  slug: "",
  summary: "",
  order: "0",
  number: "",
  input: "",
  output: "",
  constraints: "",
  level: "1",
  time: "1000",
  memory: "128",
  checker: "TOKEN",
  starterCode: starter,
  starterCodeC11: starterC11,
  reference: starter,
  tests: [],
  categoryIds: [],
  lessonIds: [],
  problemIds: [],
  lessonCategoryId: "",
  validatedAt: null,
  validationStatus: null,
  validationDiagnostic: null,
});

const statusText: Record<ContentStatus, string> = {
  DRAFT: "초안",
  PUBLISHED: "공개",
  ARCHIVED: "보관됨",
};

export default function Admin({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [draft, setDraft] = useState<ContentDraft>(() => blank());
  const [section, setSection] = useState<
    "lessons" | "problems" | "media" | "invitations"
  >("lessons");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "ALL">(
    "ALL",
  );
  const [tab, setTab] = useState("content");
  const [editorMode, setEditorMode] = useState<"visual" | "source" | "preview">(
    "visual",
  );
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const loadContent = async () => {
    setLoading(true);
    try {
      setContent(await listAdminContent());
      setError(null);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContent();
    void listAdminAssets()
      .then(setAssets)
      .catch(() => undefined);
  }, []);

  function change<K extends keyof ContentDraft>(
    key: K,
    value: ContentDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function insertMarkdown(before: string, after = "", placeholder = "내용") {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? draft.body.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = draft.body.slice(start, end) || placeholder;
    change(
      "body",
      `${draft.body.slice(0, start)}${before}${selected}${after}${draft.body.slice(end)}`,
    );
    requestAnimationFrame(() => {
      textarea?.focus();
      const position = start + before.length + selected.length + after.length;
      textarea?.setSelectionRange(position, position);
    });
  }

  async function selectLesson(id: string) {
    setBusy(true);
    try {
      const lesson = await getAdminLesson(id);
      setDraft({
        ...blank("강의"),
        id: lesson.id,
        lessonCategoryId: lesson.categoryId,
        status: lesson.status,
        editable: lesson.editable,
        versionId: lesson.editableVersion?.id ?? "",
        title: lesson.title,
        body: lesson.body,
        slug: lesson.slug,
        summary: lesson.summary,
        order: String(lesson.order),
        problemIds: lesson.problems.map((item) => item.problemId),
      });
      setTab("content");
      setSection("lessons");
      setEditorMode("visual");
      setError(null);
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function selectProblem(id: string) {
    setBusy(true);
    try {
      const problem = await getAdminProblem(id);
      const version = problem.editableVersion;
      if (!version) throw new Error("편집할 문제 버전이 없습니다.");
      const latestValidation = version.validations?.[0];
      setDraft({
        ...blank("문제"),
        id: problem.id,
        versionId: version.id,
        status: problem.status,
        editable: problem.editable,
        title: problem.title,
        body: version.statement,
        number: String(problem.number),
        input: version.inputDescription,
        output: version.outputDescription,
        constraints: version.constraints,
        level: String(problem.difficulty),
        time: String(version.timeLimitMs),
        memory: String(Math.max(1, Math.round(version.memoryLimitKiB / 1024))),
        checker: version.comparator,
        starterCode: version.starterCode,
        starterCodeC11: version.starterCodeC11,
        reference: version.referenceSource ?? "",
        tests: version.testCases.map((test) => ({
          id: test.id,
          input: test.input,
          output: test.expectedOutput,
          sample: test.visibility === "EXAMPLE",
          explanation: test.explanation ?? "",
        })),
        categoryIds: problem.categoryIds,
        lessonIds: problem.lessonIds,
        validatedAt: version.validatedAt,
        validationStatus:
          latestValidation?.status ?? (version.validatedAt ? "PASSED" : null),
        validationDiagnostic: latestValidation?.diagnostic ?? null,
      });
      setTab("content");
      setSection("problems");
      setEditorMode("visual");
      setError(null);
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(): Promise<ContentDraft | null> {
    setBusy(true);
    try {
      let versionId = draft.versionId;
      let createdVersion = false;
      if (!draft.editable && draft.id) {
        if (draft.kind === "강의") {
          versionId = (await createAdminLessonVersion(draft.id)).id;
        } else {
          versionId = (await createAdminProblemVersion(draft.id)).id;
        }
        createdVersion = true;
        setDraft((current) => ({
          ...current,
          editable: true,
          versionId,
        }));
      }
      if (draft.kind === "강의") {
        if (!draft.lessonCategoryId)
          throw new Error("학습 카테고리를 선택해 주세요.");
        const input = {
          categoryId: draft.lessonCategoryId,
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          body: draft.body,
          order: numberValue(draft.order, "표시 순서"),
        };
        const lesson = draft.id
          ? await updateAdminLesson(draft.id, input)
          : await createAdminLesson({ ...input, slug: draft.slug.trim() });
        await setAdminLessonProblems(lesson.id, draft.problemIds);
        await loadContent();
        await selectLesson(lesson.id);
        notify(
          createdVersion
            ? "새 강의 버전을 만들고 수정 내용을 저장했습니다."
            : "강의 초안을 서버에 저장했습니다.",
        );
        return { ...draft, id: lesson.id };
      }

      const input = {
        number: numberValue(draft.number, "문제 번호"),
        title: draft.title.trim(),
        difficulty: numberValue(draft.level, "난이도"),
        statement: draft.body,
        inputDescription: draft.input,
        outputDescription: draft.output,
        constraints: draft.constraints,
        comparator: draft.checker,
        allowFinalNewline: true,
        timeLimitMs: numberValue(draft.time, "시간 제한"),
        memoryLimitKiB: numberValue(draft.memory, "메모리 제한") * 1024,
        starterCode: draft.starterCode,
        starterCodeC11: draft.starterCodeC11,
        referenceSource: draft.reference,
      };
      let problemId = draft.id;
      if (!problemId) {
        const created = await createAdminProblem({
          ...input,
          number: input.number,
        });
        problemId = created.id;
        versionId = created.currentVersion.id;
      } else {
        await updateAdminProblemVersion(versionId, input);
      }
      await setAdminProblemTests(
        versionId,
        draft.tests.map((test, index) => ({
          position: index + 1,
          visibility: test.sample ? "EXAMPLE" : "HIDDEN",
          input: test.input,
          expectedOutput: test.output,
          explanation: test.explanation || undefined,
        })),
      );
      await setAdminProblemRelations(
        problemId,
        draft.categoryIds,
        draft.lessonIds,
      );
      await loadContent();
      await selectProblem(problemId);
      notify(
        createdVersion
          ? "새 문제 버전을 만들고 수정 내용을 저장했습니다."
          : "문제 초안을 서버에 저장했습니다.",
      );
      return { ...draft, id: problemId, versionId };
    } catch (reason) {
      notify(messageOf(reason));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function validateProblem() {
    const saved = await saveDraft();
    const versionId = saved?.versionId || draft.versionId;
    if (!saved || !versionId) return;
    setBusy(true);
    try {
      const requested = await requestAdminProblemValidation(versionId);
      change("validationStatus", requested.status);
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await delay(1000);
        const validation = await getAdminProblemValidation(
          requested.validationId,
        );
        setDraft((current) => ({
          ...current,
          validationStatus: validation.status,
          validationDiagnostic: validation.diagnostic,
          validatedAt:
            validation.status === "PASSED"
              ? new Date().toISOString()
              : current.validatedAt,
        }));
        if (["PASSED", "FAILED", "SYSTEM_ERROR"].includes(validation.status)) {
          notify(validation.diagnostic ?? `검증 결과: ${validation.status}`);
          return;
        }
      }
      notify(
        "검증이 계속 진행 중입니다. 잠시 후 문제를 다시 선택해 확인해 주세요.",
      );
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function publishCurrent() {
    setBusy(true);
    try {
      if (draft.kind === "강의") {
        if (!draft.id) throw new Error("강의를 먼저 저장해 주세요.");
        await publishAdminLesson(draft.id);
        await loadContent();
        await selectLesson(draft.id);
      } else {
        if (!draft.versionId) throw new Error("문제를 먼저 저장해 주세요.");
        await publishAdminProblemVersion(draft.versionId);
        await loadContent();
        await selectProblem(draft.id);
      }
      notify("콘텐츠를 공개했습니다.");
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function archiveCurrent() {
    setBusy(true);
    try {
      if (draft.kind === "강의") await archiveAdminLesson(draft.id);
      else await archiveAdminProblem(draft.id);
      await loadContent();
      if (draft.kind === "강의") await selectLesson(draft.id);
      else await selectProblem(draft.id);
      setArchiveOpen(false);
      notify("콘텐츠를 보관했습니다.");
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function restoreCurrent() {
    setBusy(true);
    try {
      if (draft.kind === "강의") await restoreAdminLesson(draft.id);
      else await restoreAdminProblem(draft.id);
      await loadContent();
      if (draft.kind === "강의") await selectLesson(draft.id);
      else await selectProblem(draft.id);
      notify("콘텐츠를 복원했습니다.");
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  const sectionItems =
    (section === "lessons"
      ? content?.lessons.map((item) => ({ ...item, kind: "강의" as const }))
      : section === "problems"
        ? content?.problems.map((item) => ({
            ...item,
            kind: "문제" as const,
          }))
        : []) ?? [];
  const visibleItems = sectionItems.filter(
    (item) =>
      (statusFilter === "ALL" || item.status === statusFilter) &&
      `${item.kind === "문제" ? item.number : ""} ${item.title}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="eyebrow">CONTENT STUDIO</div>
      <div className="page-heading compact">
        <div>
          <h1>콘텐츠 관리</h1>
          <p>서버에 초안을 저장하고 기준 코드 검증을 거쳐 공개합니다.</p>
        </div>
      </div>
      <div className="info-strip">
        <Shield size={18} /> 관리자 API 연결됨 · 숨김 테스트와 기준 코드는
        관리자 권한으로만 조회됩니다.
      </div>
      <nav className="admin-sections" aria-label="관리 영역">
        <button
          className={section === "lessons" ? "active" : ""}
          onClick={() => {
            setSection("lessons");
            setDraft(blank("강의"));
          }}
        >
          강의 <span>{content?.lessons.length ?? 0}</span>
        </button>
        <button
          className={section === "problems" ? "active" : ""}
          onClick={() => {
            setSection("problems");
            setDraft(blank("문제"));
          }}
        >
          문제 <span>{content?.problems.length ?? 0}</span>
        </button>
        <button
          className={section === "media" ? "active" : ""}
          onClick={() => setSection("media")}
        >
          미디어 <span>{assets.length}</span>
        </button>
        <button
          className={section === "invitations" ? "active" : ""}
          onClick={() => setSection("invitations")}
        >
          회원 초대
        </button>
      </nav>
      {error && <div className="auth-note">{error}</div>}
      {section === "lessons" && (
        <div className="category-manager-toggle">
          <button
            className="button secondary"
            type="button"
            onClick={() => setShowCategoryManager((value) => !value)}
          >
            {showCategoryManager ? "카테고리 관리 닫기" : "학습 카테고리 관리"}
          </button>
        </div>
      )}
      {section === "lessons" && showCategoryManager && content && (
        <LessonCategoryManager
          categories={content.lessonCategories}
          busy={busy}
          onBusy={setBusy}
          reload={loadContent}
          notify={notify}
        />
      )}
      {section === "media" ? (
        <MediaManager
          assets={assets}
          busy={busy}
          onBusy={setBusy}
          onChange={setAssets}
          notify={notify}
        />
      ) : section === "invitations" ? (
        <InvitationManager notify={notify} />
      ) : (
        <div className="admin-layout">
          <aside className="admin-list">
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => {
                const next = blank(section === "lessons" ? "강의" : "문제");
                if (section === "lessons")
                  next.lessonCategoryId =
                    content?.lessonCategories.find(
                      (item) => item.status !== "ARCHIVED",
                    )?.id ?? "";
                setDraft(next);
                setEditorMode("visual");
                setTab("content");
              }}
            >
              새 {section === "lessons" ? "강의" : "문제"} 작성{" "}
              <Plus size={15} />
            </button>
            <div className="admin-list-filter">
              <Search size={14} />
              <input
                aria-label="콘텐츠 검색"
                placeholder="제목 또는 번호 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              aria-label="공개 상태 필터"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ContentStatus | "ALL")
              }
            >
              <option value="ALL">모든 상태</option>
              <option value="DRAFT">초안</option>
              <option value="PUBLISHED">공개</option>
              <option value="ARCHIVED">보관됨</option>
            </select>
            <h3>
              {section === "lessons" ? "강의" : "문제"}{" "}
              <span>{visibleItems.length}</span>
            </h3>
            {loading ? (
              <p className="small-muted">불러오는 중...</p>
            ) : section === "lessons" ? (
              content?.lessonCategories.map((category, categoryIndex) => {
                const categoryItems = visibleItems.filter(
                  (item) =>
                    item.kind === "강의" && item.categoryId === category.id,
                );
                if (!categoryItems.length && query) return null;
                return (
                  <div className="admin-lesson-group" key={category.id}>
                    <strong>
                      {categoryIndex + 1}. {category.title}
                    </strong>
                    {categoryItems.map((item, itemIndex) => (
                      <button
                        className={`draft-item ${draft.id === item.id ? "selected" : ""}`}
                        key={item.id}
                        disabled={busy}
                        onClick={() => void selectLesson(item.id)}
                      >
                        <small>
                          {categoryIndex + 1}.{itemIndex + 1} ·{" "}
                          {statusText[item.status]}
                        </small>
                        <strong>{item.title}</strong>
                      </button>
                    ))}
                  </div>
                );
              })
            ) : (
              visibleItems.map((item) => (
                <button
                  className={`draft-item ${draft.id === item.id ? "selected" : ""}`}
                  key={`${item.kind}-${item.id}`}
                  disabled={busy}
                  onClick={() =>
                    void (item.kind === "강의"
                      ? selectLesson(item.id)
                      : selectProblem(item.id))
                  }
                >
                  <small>
                    {item.kind} · {statusText[item.status]}
                  </small>
                  <strong>
                    {item.kind === "문제" ? `${item.number}. ` : ""}
                    {item.title}
                  </strong>
                </button>
              ))
            )}
          </aside>

          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDraft();
            }}
          >
            <div className="admin-heading">
              <h2>{draft.id ? "콘텐츠 수정" : "새 콘텐츠 작성"}</h2>
              <span className="badge gray">{statusText[draft.status]}</span>
            </div>
            {draft.id && !draft.editable && (
              <div className="auth-note">
                현재 공개 중인 버전입니다. 내용을 수정한 뒤 초안 저장을 누르면
                공개본은 유지되고 편집용 새 버전이 자동으로 생성됩니다.
              </div>
            )}
            <div className="two-fields">
              <label>
                콘텐츠 유형
                <select
                  disabled={Boolean(draft.id) || busy}
                  value={draft.kind}
                  onChange={(event) => {
                    setDraft(blank(event.target.value as "문제" | "강의"));
                    setTab("content");
                  }}
                >
                  <option>문제</option>
                  <option>강의</option>
                </select>
              </label>
              <label>
                제목
                <input
                  required
                  maxLength={200}
                  disabled={busy}
                  value={draft.title}
                  onChange={(event) => change("title", event.target.value)}
                />
              </label>
            </div>

            {draft.kind === "강의" ? (
              <div className="two-fields">
                <label>
                  Slug
                  <input
                    required
                    disabled={Boolean(draft.id) || busy}
                    value={draft.slug}
                    onChange={(event) => change("slug", event.target.value)}
                  />
                </label>
                <label>
                  표시 순서
                  <input
                    type="number"
                    min={0}
                    disabled={busy}
                    value={draft.order}
                    onChange={(event) => change("order", event.target.value)}
                  />
                </label>
                <label>
                  학습 카테고리
                  <select
                    required
                    disabled={busy}
                    value={draft.lessonCategoryId}
                    onChange={(event) =>
                      change("lessonCategoryId", event.target.value)
                    }
                  >
                    <option value="">카테고리 선택</option>
                    {content?.lessonCategories
                      .filter(
                        (category) =>
                          category.status !== "ARCHIVED" ||
                          category.id === draft.lessonCategoryId,
                      )
                      .map((category, index) => (
                        <option key={category.id} value={category.id}>
                          {index + 1}. {category.title} ·{" "}
                          {statusText[category.status]}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="two-fields">
                <label>
                  문제 번호
                  <input
                    required
                    type="number"
                    min={1}
                    disabled={Boolean(draft.id) || busy}
                    value={draft.number}
                    onChange={(event) => change("number", event.target.value)}
                  />
                </label>
                <label>
                  난이도
                  <select
                    disabled={busy}
                    value={draft.level}
                    onChange={(event) => change("level", event.target.value)}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        단계 {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="admin-tabs">
              <button
                type="button"
                className={tab === "content" ? "active" : ""}
                onClick={() => setTab("content")}
              >
                본문 및 연결
              </button>
              {draft.kind === "문제" && (
                <>
                  <button
                    type="button"
                    className={tab === "settings" ? "active" : ""}
                    onClick={() => setTab("settings")}
                  >
                    문제 조건
                  </button>
                  <button
                    type="button"
                    className={tab === "tests" ? "active" : ""}
                    onClick={() => setTab("tests")}
                  >
                    테스트 · 기준 코드
                  </button>
                </>
              )}
            </div>

            {tab === "content" && (
              <>
                {draft.kind === "강의" && (
                  <label>
                    요약
                    <textarea
                      rows={2}
                      maxLength={500}
                      disabled={busy}
                      value={draft.summary}
                      onChange={(event) =>
                        change("summary", event.target.value)
                      }
                    />
                  </label>
                )}
                <div className="editor-mode-bar">
                  <div
                    className="editor-mode-switch"
                    aria-label="본문 편집 방식"
                  >
                    <button
                      type="button"
                      className={editorMode === "visual" ? "active" : ""}
                      onClick={() => setEditorMode("visual")}
                    >
                      시각적 편집
                    </button>
                    <button
                      type="button"
                      className={editorMode === "source" ? "active" : ""}
                      onClick={() => setEditorMode("source")}
                    >
                      Markdown 원문
                    </button>
                    <button
                      type="button"
                      className={editorMode === "preview" ? "active" : ""}
                      onClick={() => setEditorMode("preview")}
                    >
                      미리보기
                    </button>
                  </div>
                  <small>
                    시각적 편집에서 <kbd>/</kbd>를 누르면 제목, 목록, 코드, 표를
                    선택할 수 있습니다.
                  </small>
                </div>
                {editorMode === "source" && (
                  <div className="editor-toolbar">
                    <div className="markdown-tools">
                      <button
                        type="button"
                        onClick={() => insertMarkdown("## ", "", "제목")}
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown("**", "**", "굵게")}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertMarkdown("[", "](https://)", "링크")
                        }
                      >
                        링크
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertMarkdown("![", "](/이미지-주소)", "이미지 설명")
                        }
                      >
                        이미지
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertMarkdown("```cpp\n", "\n```", "// C++ 코드")
                        }
                      >
                        C++
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertMarkdown(":::tip\n", "\n:::", "도움말")
                        }
                      >
                        TIP
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertMarkdown(
                            "| 항목 | 설명 |\n| --- | --- |\n| ",
                            " | 내용 |",
                            "값",
                          )
                        }
                      >
                        표
                      </button>
                    </div>
                  </div>
                )}
                {editorMode === "preview" ? (
                  <div className="admin-preview">
                    <h3>{draft.title || "콘텐츠 제목"}</h3>
                    <Markdown>
                      {draft.body || "작성한 본문이 여기에 표시됩니다."}
                    </Markdown>
                  </div>
                ) : editorMode === "source" ? (
                  <label>
                    본문 (Markdown)
                    <textarea
                      ref={bodyRef}
                      rows={12}
                      disabled={busy}
                      value={draft.body}
                      onChange={(event) => change("body", event.target.value)}
                    />
                    <small>
                      도움말 같은 고급 블록은 <code>:::tip</code> 형식으로
                      이곳에서 편집할 수 있습니다.
                    </small>
                  </label>
                ) : (
                  <VisualMarkdownEditor
                    documentKey={`${draft.kind}:${draft.id || "new"}:${draft.versionId}`}
                    disabled={busy}
                    value={draft.body}
                    onChange={(value) => change("body", value)}
                  />
                )}

                {draft.kind === "문제" ? (
                  <>
                    <fieldset className="linked-problems">
                      <legend>연결 강의</legend>
                      {content?.lessons.map((lesson) => (
                        <label key={lesson.id}>
                          <input
                            type="checkbox"
                            disabled={busy}
                            checked={draft.lessonIds.includes(lesson.id)}
                            onChange={(event) =>
                              change(
                                "lessonIds",
                                toggle(
                                  draft.lessonIds,
                                  lesson.id,
                                  event.target.checked,
                                ),
                              )
                            }
                          />
                          {lesson.title}
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="linked-problems">
                      <legend>카테고리</legend>
                      {content?.categories.map((category) => (
                        <label key={category.id}>
                          <input
                            type="checkbox"
                            disabled={busy}
                            checked={draft.categoryIds.includes(category.id)}
                            onChange={(event) =>
                              change(
                                "categoryIds",
                                toggle(
                                  draft.categoryIds,
                                  category.id,
                                  event.target.checked,
                                ),
                              )
                            }
                          />
                          {category.name}
                        </label>
                      ))}
                    </fieldset>
                  </>
                ) : (
                  <fieldset className="linked-problems">
                    <legend>연결 문제</legend>
                    {content?.problems.map((problem) => (
                      <label key={problem.id}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={draft.problemIds.includes(problem.id)}
                          onChange={(event) =>
                            change(
                              "problemIds",
                              toggle(
                                draft.problemIds,
                                problem.id,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        {problem.number}. {problem.title}
                      </label>
                    ))}
                  </fieldset>
                )}
              </>
            )}

            {tab === "settings" && (
              <>
                {textField(draft, change, "input", "입력 형식", busy)}
                {textField(draft, change, "output", "출력 형식", busy)}
                {textField(draft, change, "constraints", "제약 조건", busy)}
                <div className="two-fields">
                  <label>
                    시간 제한 (ms)
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      disabled={busy}
                      value={draft.time}
                      onChange={(event) => change("time", event.target.value)}
                    />
                  </label>
                  <label>
                    메모리 제한 (MiB)
                    <input
                      type="number"
                      min={16}
                      max={512}
                      disabled={busy}
                      value={draft.memory}
                      onChange={(event) => change("memory", event.target.value)}
                    />
                  </label>
                </div>
                <label>
                  출력 비교 규칙
                  <select
                    disabled={busy}
                    value={draft.checker}
                    onChange={(event) =>
                      change("checker", event.target.value as "TOKEN" | "EXACT")
                    }
                  >
                    <option value="TOKEN">TOKEN · 공백 토큰 비교</option>
                    <option value="EXACT">EXACT · 정확히 비교</option>
                  </select>
                </label>
                <label>
                  C++17 기본 코드
                  <textarea
                    rows={8}
                    disabled={busy}
                    value={draft.starterCode}
                    onChange={(event) =>
                      change("starterCode", event.target.value)
                    }
                  />
                </label>
                <label>
                  C11 기본 코드
                  <textarea
                    rows={8}
                    disabled={busy}
                    value={draft.starterCodeC11}
                    onChange={(event) =>
                      change("starterCodeC11", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            {tab === "tests" && (
              <>
                <div className="auth-note">
                  공개 예제 1개와 숨김 테스트 3개 이상, C++17 기준 코드가
                  있어야 검증할 수 있습니다. 같은 테스트가 C11 제출에도
                  사용됩니다.
                </div>
                {draft.tests.map((test, index) => (
                  <div className="test-case" key={test.id}>
                    <div className="test-case-heading">
                      <strong>테스트 {index + 1}</strong>
                      <div className="test-case-controls">
                        <label>
                          <input
                            type="checkbox"
                            disabled={busy}
                            checked={test.sample}
                            onChange={(event) =>
                              change(
                                "tests",
                                draft.tests.map((item) =>
                                  item.id === test.id
                                    ? { ...item, sample: event.target.checked }
                                    : item,
                                ),
                              )
                            }
                          />
                          공개 예제
                        </label>
                        <button
                          type="button"
                          aria-label={`테스트 ${index + 1} 삭제`}
                          disabled={busy}
                          onClick={() =>
                            change(
                              "tests",
                              draft.tests.filter((item) => item.id !== test.id),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="two-fields">
                      <label>
                        입력
                        <textarea
                          disabled={busy}
                          value={test.input}
                          onChange={(event) =>
                            change(
                              "tests",
                              draft.tests.map((item) =>
                                item.id === test.id
                                  ? { ...item, input: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        기대 출력
                        <textarea
                          disabled={busy}
                          value={test.output}
                          onChange={(event) =>
                            change(
                              "tests",
                              draft.tests.map((item) =>
                                item.id === test.id
                                  ? { ...item, output: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <label>
                      예제 설명 (선택)
                      <textarea
                        disabled={busy}
                        value={test.explanation}
                        onChange={(event) =>
                          change(
                            "tests",
                            draft.tests.map((item) =>
                              item.id === test.id
                                ? { ...item, explanation: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    change("tests", [
                      ...draft.tests,
                      {
                        id: crypto.randomUUID(),
                        input: "",
                        output: "",
                        sample: draft.tests.length === 0,
                        explanation: "",
                      },
                    ])
                  }
                >
                  <Plus size={15} />
                  테스트 추가
                </button>
                <label className="reference-code">
                  C++17 기준 정답 코드
                  <textarea
                    rows={9}
                    disabled={busy}
                    value={draft.reference}
                    onChange={(event) =>
                      change("reference", event.target.value)
                    }
                  />
                </label>
                <div className="auth-note">
                  검증 상태: {draft.validationStatus ?? "검증 전"}
                  {draft.validationDiagnostic
                    ? ` · ${draft.validationDiagnostic}`
                    : ""}
                </div>
              </>
            )}

            <div className="actions">
              <button className="button primary" type="submit" disabled={busy}>
                초안 저장 <Check size={15} />
              </button>
              {draft.kind === "문제" && draft.versionId && draft.editable && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void validateProblem()}
                >
                  기준 코드 검증
                </button>
              )}
              {draft.id &&
                draft.editable &&
                (draft.kind === "강의" || draft.validatedAt) && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void publishCurrent()}
                  >
                    공개
                  </button>
                )}
              {draft.id && draft.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setArchiveOpen(true)}
                >
                  <Archive size={15} />
                  보관
                </button>
              ) : (
                draft.id && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void restoreCurrent()}
                  >
                    <RotateCcw size={15} />
                    복원
                  </button>
                )
              )}
            </div>
          </form>
        </div>
      )}
      {archiveOpen && (
        <ConfirmDialog
          titleId="archive-title"
          onClose={() => setArchiveOpen(false)}
        >
          <h2 id="archive-title">콘텐츠를 보관할까요?</h2>
          <p>
            보관한 콘텐츠는 공개 목록에서 제외되며 나중에 복원할 수 있습니다.
          </p>
          <div className="actions">
            <button
              autoFocus
              className="button secondary"
              onClick={() => setArchiveOpen(false)}
            >
              취소
            </button>
            <button
              className="button primary"
              onClick={() => void archiveCurrent()}
            >
              보관하기
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}

type AdminLessonCategory = AdminContent["lessonCategories"][number];

function LessonCategoryManager({
  categories,
  busy,
  onBusy,
  reload,
  notify,
}: {
  categories: AdminLessonCategory[];
  busy: boolean;
  onBusy: (value: boolean) => void;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = categories.find((item) => item.id === selectedId);
  const [language, setLanguage] = useState<"C" | "CPP">("CPP");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [order, setOrder] = useState("1");

  function choose(category?: AdminLessonCategory) {
    setSelectedId(category?.id ?? "");
    setLanguage(category?.language ?? "CPP");
    setSlug(category?.slug ?? "");
    setTitle(category?.title ?? "");
    setSummary(category?.summary ?? "");
    setOrder(String(category?.order ?? categories.length + 1));
  }

  async function run(operation: () => Promise<unknown>, message: string) {
    onBusy(true);
    try {
      await operation();
      await reload();
      notify(message);
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      onBusy(false);
    }
  }

  return (
    <section className="lesson-category-manager">
      <div className="category-manager-list">
        <div>
          <h2>학습 카테고리</h2>
          <button
            type="button"
            className="button secondary"
            onClick={() => choose()}
          >
            <Plus size={14} /> 새 카테고리
          </button>
        </div>
        {categories.map((category, index) => (
          <button
            type="button"
            className={selectedId === category.id ? "selected" : ""}
            key={category.id}
            onClick={() => choose(category)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{category.title}</strong>
              <small>
                {category.language === "C" ? "C 언어" : "C++"} ·{" "}
                {statusText[category.status]} · 강의 {category._count.lessons}개
              </small>
            </div>
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () =>
              selected
                ? updateAdminLessonCategory(selected.id, {
                    language,
                    slug: slug.trim(),
                    title: title.trim(),
                    summary: summary.trim(),
                    order: numberValue(order, "표시 순서"),
                  })
                : createAdminLessonCategory({
                    language,
                    slug: slug.trim(),
                    title: title.trim(),
                    summary: summary.trim(),
                    order: numberValue(order, "표시 순서"),
                  }),
            selected ? "카테고리를 수정했습니다." : "카테고리를 만들었습니다.",
          );
        }}
      >
        <div className="admin-heading">
          <h2>{selected ? "카테고리 수정" : "새 카테고리"}</h2>
          {selected && (
            <span className="badge gray">{statusText[selected.status]}</span>
          )}
        </div>
        <label>
          학습 언어
          <select
            disabled={busy}
            value={language}
            onChange={(event) => setLanguage(event.target.value as "C" | "CPP")}
          >
            <option value="CPP">C++</option>
            <option value="C">C 언어</option>
          </select>
        </label>
        <div className="two-fields">
          <label>
            Slug
            <input
              required
              disabled={busy}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="arrays"
            />
            {selected && (
              <small>카테고리 식별자입니다. 중복되지 않게 입력해 주세요.</small>
            )}
          </label>
          <label>
            표시 순서
            <input
              required
              type="number"
              min={0}
              disabled={busy}
              value={order}
              onChange={(event) => setOrder(event.target.value)}
            />
          </label>
        </div>
        <label>
          카테고리 이름
          <input
            required
            maxLength={200}
            disabled={busy}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="배열"
          />
        </label>
        <label>
          소개
          <textarea
            rows={3}
            maxLength={500}
            disabled={busy}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        <div className="actions">
          <button className="button primary" disabled={busy}>
            <Check size={14} /> 저장
          </button>
          {selected && selected.status !== "PUBLISHED" && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => setAdminLessonCategoryStatus(selected.id, "publish"),
                  "카테고리를 공개했습니다.",
                )
              }
            >
              공개
            </button>
          )}
          {selected?.status === "PUBLISHED" && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => setAdminLessonCategoryStatus(selected.id, "archive"),
                  "카테고리를 보관했습니다.",
                )
              }
            >
              <Archive size={14} /> 보관
            </button>
          )}
          {selected?.status === "ARCHIVED" && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => setAdminLessonCategoryStatus(selected.id, "restore"),
                  "카테고리를 초안으로 복원했습니다.",
                )
              }
            >
              <RotateCcw size={14} /> 복원
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function MediaManager({
  assets,
  busy,
  onBusy,
  onChange,
  notify,
}: {
  assets: ContentAsset[];
  busy: boolean;
  onBusy: (value: boolean) => void;
  onChange: (items: ContentAsset[]) => void;
  notify: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  return (
    <section className="media-manager">
      <form
        className="media-upload"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!file) return notify("업로드할 이미지를 선택해 주세요.");
          onBusy(true);
          try {
            const asset = await uploadAdminAsset(file, altText);
            onChange([asset, ...assets]);
            setFile(null);
            setAltText("");
            (
              event.currentTarget.elements.namedItem(
                "assetFile",
              ) as HTMLInputElement
            ).value = "";
            notify("이미지를 업로드했습니다.");
          } catch (reason) {
            notify(messageOf(reason));
          } finally {
            onBusy(false);
          }
        }}
      >
        <div>
          <h2>미디어 라이브러리</h2>
          <p className="small-muted">PNG, JPEG, GIF, WebP · 파일당 최대 5MB</p>
        </div>
        <label>
          이미지 파일
          <input
            name="assetFile"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          대체 텍스트
          <input
            maxLength={300}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="이미지를 볼 수 없을 때 표시할 설명"
          />
        </label>
        <button className="button primary" disabled={busy || !file}>
          <Upload size={15} /> 업로드
        </button>
      </form>
      {!assets.length ? (
        <div className="empty">
          <h3>업로드한 이미지가 없습니다.</h3>
        </div>
      ) : (
        <div className="media-grid">
          {assets.map((asset) => {
            const url = mediaUrl(asset);
            const markdown = `![${asset.altText || asset.originalName}](${url})`;
            return (
              <article className="media-card" key={asset.id}>
                <img
                  src={url}
                  alt={asset.altText || asset.originalName}
                  loading="lazy"
                />
                <div>
                  <strong>{asset.originalName}</strong>
                  <small>
                    {Math.ceil(asset.fileSize / 1024)} KB · {asset.mimeType}
                  </small>
                </div>
                <div className="actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(markdown);
                      notify("Markdown 이미지 문법을 복사했습니다.");
                    }}
                  >
                    Markdown 복사
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`${asset.originalName} 삭제`}
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      onBusy(true);
                      try {
                        await deleteAdminAsset(asset.id);
                        onChange(assets.filter((item) => item.id !== asset.id));
                        notify("이미지를 삭제했습니다.");
                      } catch (reason) {
                        notify(messageOf(reason));
                      } finally {
                        onBusy(false);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InvitationManager({ notify }: { notify: (message: string) => void }) {
  const [items, setItems] = useState<AdminInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [createdLink, setCreatedLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listAdminInvitations());
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(createdLink);
      notify("초대 링크를 복사했습니다.");
    } catch {
      notify("초대 링크를 복사하지 못했습니다.");
    }
  }

  return (
    <section className="invitation-manager">
      <div className="invitation-create">
        <div>
          <div className="eyebrow">MEMBER INVITATION</div>
          <h2>회원 초대</h2>
          <p>초대 링크는 발급 후 24시간 동안 한 번만 사용할 수 있습니다.</p>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setCreatedLink("");
            try {
              const invitation = await createAdminInvitation(
                email.trim().toLowerCase(),
              );
              const link = `${window.location.origin}/register?invite=${encodeURIComponent(invitation.token)}`;
              setCreatedLink(link);
              setEmail("");
              await load();
              notify("24시간 유효한 초대 링크를 만들었습니다.");
            } catch (reason) {
              notify(messageOf(reason));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            초대할 이메일
            <input
              type="email"
              required
              maxLength={320}
              disabled={busy}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="learner@example.com"
            />
          </label>
          <button className="button primary" type="submit" disabled={busy}>
            <UserPlus size={15} />
            {busy ? "발급 중…" : "초대 링크 발급"}
          </button>
        </form>
        {createdLink && (
          <div className="invitation-link">
            <strong>지금 링크를 복사해 전달하세요</strong>
            <p>
              보안을 위해 원본 링크는 이 화면을 벗어나면 다시 표시되지 않습니다.
            </p>
            <div>
              <input
                aria-label="생성된 초대 링크"
                readOnly
                value={createdLink}
              />
              <button
                className="button secondary"
                type="button"
                onClick={copyLink}
              >
                <Copy size={15} /> 복사
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="invitation-list">
        <div>
          <h2>발급 내역</h2>
          <span>{items.length}건</span>
        </div>
        {loading ? (
          <p className="small-muted">초대 내역을 불러오는 중…</p>
        ) : !items.length ? (
          <p className="small-muted">아직 발급한 초대가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>상태</th>
                  <th>발급자</th>
                  <th>만료 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((invitation) => {
                  const expired = new Date(invitation.expiresAt) <= new Date();
                  const status = invitation.acceptedAt
                    ? "가입 완료"
                    : invitation.revokedAt
                      ? "취소됨"
                      : expired
                        ? "만료됨"
                        : "대기 중";
                  const active =
                    !invitation.acceptedAt && !invitation.revokedAt && !expired;
                  return (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>
                        <span className={`badge ${active ? "green" : "gray"}`}>
                          {status}
                        </span>
                      </td>
                      <td>{invitation.invitedBy.nickname}</td>
                      <td>
                        {new Date(invitation.expiresAt).toLocaleString("ko-KR")}
                      </td>
                      <td>
                        {active && (
                          <button
                            className="text-button"
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await revokeAdminInvitation(invitation.id);
                                await load();
                                notify("초대를 취소했습니다.");
                              } catch (reason) {
                                notify(messageOf(reason));
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function textField(
  draft: ContentDraft,
  change: <K extends keyof ContentDraft>(
    key: K,
    value: ContentDraft[K],
  ) => void,
  key: "input" | "output" | "constraints",
  label: string,
  busy: boolean,
) {
  return (
    <label>
      {label}
      <textarea
        rows={2}
        disabled={busy}
        value={draft[key]}
        onChange={(event) => change(key, event.target.value)}
      />
    </label>
  );
}

function toggle(values: string[], value: string, checked: boolean) {
  return checked ? [...values, value] : values.filter((item) => item !== value);
}

function numberValue(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed))
    throw new Error(`${label} 값을 확인해 주세요.`);
  return parsed;
}

function messageOf(reason: unknown) {
  if (reason instanceof ApiError || reason instanceof Error)
    return reason.message;
  return "요청을 처리하지 못했습니다.";
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
