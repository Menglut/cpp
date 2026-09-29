"use client";

import { useEffect, useState } from "react";
import { Archive, Check, Plus, RotateCcw, Shield } from "lucide-react";
import {
  ApiError,
  archiveAdminLesson,
  archiveAdminProblem,
  createAdminLesson,
  createAdminProblem,
  createAdminProblemVersion,
  getAdminLesson,
  getAdminProblem,
  getAdminProblemValidation,
  listAdminContent,
  publishAdminLesson,
  publishAdminProblemVersion,
  requestAdminProblemValidation,
  restoreAdminLesson,
  restoreAdminProblem,
  setAdminLessonProblems,
  setAdminProblemRelations,
  setAdminProblemTests,
  updateAdminLesson,
  updateAdminProblemVersion,
  type AdminContent,
  type ContentStatus,
  type ValidationStatus,
} from "@/lib/api";
import { starter } from "@/lib/data";
import ConfirmDialog from "./confirm-dialog";
import Markdown from "./markdown";

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
  reference: string;
  tests: TestCase[];
  categoryIds: string[];
  lessonIds: string[];
  problemIds: string[];
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
  reference: starter,
  tests: [],
  categoryIds: [],
  lessonIds: [],
  problemIds: [],
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
  const [draft, setDraft] = useState<ContentDraft>(() => blank());
  const [tab, setTab] = useState("content");
  const [preview, setPreview] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  function change<K extends keyof ContentDraft>(
    key: K,
    value: ContentDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function selectLesson(id: string) {
    setBusy(true);
    try {
      const lesson = await getAdminLesson(id);
      setDraft({
        ...blank("강의"),
        id: lesson.id,
        status: lesson.status,
        title: lesson.title,
        body: lesson.body,
        slug: lesson.slug,
        summary: lesson.summary,
        order: String(lesson.order),
        problemIds: lesson.problems.map((item) => item.problemId),
      });
      setTab("content");
      setPreview(false);
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
      setPreview(false);
      setError(null);
    } catch (reason) {
      notify(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(): Promise<ContentDraft | null> {
    if (!draft.editable) {
      notify("공개 버전은 수정할 수 없습니다. 새 버전을 먼저 만들어 주세요.");
      return null;
    }
    setBusy(true);
    try {
      if (draft.kind === "강의") {
        const input = {
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
        notify("강의 초안을 서버에 저장했습니다.");
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
        referenceSource: draft.reference,
      };
      let problemId = draft.id;
      let versionId = draft.versionId;
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
      notify("문제 초안을 서버에 저장했습니다.");
      return { ...draft, id: problemId, versionId };
    } catch (reason) {
      notify(messageOf(reason));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function makeNewVersion() {
    if (!draft.id) return;
    setBusy(true);
    try {
      await createAdminProblemVersion(draft.id);
      await loadContent();
      await selectProblem(draft.id);
      notify("공개 버전을 복사해 새 초안 버전을 만들었습니다.");
    } catch (reason) {
      notify(messageOf(reason));
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

  const allItems = [
    ...(content?.lessons.map((item) => ({ ...item, kind: "강의" as const })) ??
      []),
    ...(content?.problems.map((item) => ({ ...item, kind: "문제" as const })) ??
      []),
  ];

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
      {error && <div className="auth-note">{error}</div>}
      <div className="admin-layout">
        <aside className="admin-list">
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => {
              setDraft(blank());
              setPreview(false);
              setTab("content");
            }}
          >
            새 콘텐츠 작성 <Plus size={15} />
          </button>
          <h3>
            서버 콘텐츠 <span>{allItems.length}</span>
          </h3>
          {loading ? (
            <p className="small-muted">불러오는 중...</p>
          ) : (
            allItems.map((item) => (
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
                disabled={!draft.editable || busy}
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
                  disabled={!draft.editable || busy}
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
                    onChange={(event) => change("summary", event.target.value)}
                  />
                </label>
              )}
              <div className="editor-toolbar">
                <span className="small-muted">
                  Markdown · 원시 HTML과 스크립트는 실행하지 않습니다.
                </span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setPreview((value) => !value)}
                >
                  {preview ? "편집하기" : "미리보기"}
                </button>
              </div>
              {preview ? (
                <div className="admin-preview">
                  <h3>{draft.title || "콘텐츠 제목"}</h3>
                  <Markdown>
                    {draft.body || "작성한 본문이 여기에 표시됩니다."}
                  </Markdown>
                </div>
              ) : (
                <label>
                  본문 (Markdown)
                  <textarea
                    rows={12}
                    disabled={!draft.editable || busy}
                    value={draft.body}
                    onChange={(event) => change("body", event.target.value)}
                  />
                </label>
              )}

              {draft.kind === "문제" ? (
                <>
                  <fieldset className="linked-problems">
                    <legend>연결 강의</legend>
                    {content?.lessons.map((lesson) => (
                      <label key={lesson.id}>
                        <input
                          type="checkbox"
                          disabled={!draft.editable || busy}
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
                          disabled={!draft.editable || busy}
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
                    disabled={!draft.editable || busy}
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
                    disabled={!draft.editable || busy}
                    value={draft.memory}
                    onChange={(event) => change("memory", event.target.value)}
                  />
                </label>
              </div>
              <label>
                출력 비교 규칙
                <select
                  disabled={!draft.editable || busy}
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
                기본 코드
                <textarea
                  rows={8}
                  disabled={!draft.editable || busy}
                  value={draft.starterCode}
                  onChange={(event) =>
                    change("starterCode", event.target.value)
                  }
                />
              </label>
            </>
          )}

          {tab === "tests" && (
            <>
              <div className="auth-note">
                공개 예제 1개와 숨김 테스트 3개 이상, 기준 코드가 있어야 검증할
                수 있습니다.
              </div>
              {draft.tests.map((test, index) => (
                <div className="test-case" key={test.id}>
                  <div className="test-case-heading">
                    <strong>테스트 {index + 1}</strong>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!draft.editable || busy}
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
                  </div>
                  <div className="two-fields">
                    <label>
                      입력
                      <textarea
                        disabled={!draft.editable || busy}
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
                        disabled={!draft.editable || busy}
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
                </div>
              ))}
              <button
                type="button"
                className="button secondary"
                disabled={!draft.editable || busy}
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
                기준 정답 코드
                <textarea
                  rows={9}
                  disabled={!draft.editable || busy}
                  value={draft.reference}
                  onChange={(event) => change("reference", event.target.value)}
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
            <button
              className="button primary"
              type="submit"
              disabled={!draft.editable || busy}
            >
              초안 저장 <Check size={15} />
            </button>
            {draft.kind === "문제" && draft.id && !draft.editable && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void makeNewVersion()}
              >
                새 버전 만들기
              </button>
            )}
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
              (draft.kind === "강의" || draft.validatedAt) &&
              draft.status !== "PUBLISHED" && (
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
        disabled={!draft.editable || busy}
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
