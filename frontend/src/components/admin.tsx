"use client";
import { useEffect, useState } from "react";
import { Check, Shield, Plus, Archive, RotateCcw } from "lucide-react";
import { lessons, problems, starter } from "@/lib/data";
import Markdown from "./markdown";
import ConfirmDialog from "./confirm-dialog";
type TestCase = { id: string; input: string; output: string; sample: boolean };
type ContentDraft = {
  id: string;
  kind: string;
  title: string;
  body: string;
  related: string;
  state: "DRAFT" | "ARCHIVED";
  input: string;
  output: string;
  constraints: string;
  level: string;
  category: string;
  time: string;
  memory: string;
  checker: string;
  tests: TestCase[];
  reference: string;
  links: string[];
};
const blank = (): ContentDraft => ({
  id: "",
  kind: "문제",
  title: "",
  body: "",
  related: "io",
  state: "DRAFT",
  input: "",
  output: "",
  constraints: "",
  level: "1",
  category: "입출력",
  time: "1000",
  memory: "128",
  checker: "TOKEN",
  tests: [],
  reference: starter,
  links: [],
});
export default function Admin({ notify }: { notify: (s: string) => void }) {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]),
    [draft, setDraft] = useState<ContentDraft>(blank),
    [tab, setTab] = useState("content"),
    [preview, setPreview] = useState(false),
    [archive, setArchive] = useState(false);
  useEffect(() => {
    try {
      const rows = JSON.parse(
        localStorage.getItem("cppstudy:content-v1") || "[]",
      );
      if (Array.isArray(rows)) setDrafts(rows);
    } catch {
      notify("저장된 초안을 읽지 못했어요. 새 초안을 작성할 수 있습니다.");
    }
  }, []);
  function change<K extends keyof ContentDraft>(
    key: K,
    value: ContentDraft[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function persist(nextDraft: ContentDraft) {
    const d = { ...nextDraft, id: nextDraft.id || crypto.randomUUID() };
    const next = [d, ...drafts.filter((x) => x.id !== d.id)];
    try {
      localStorage.setItem("cppstudy:content-v1", JSON.stringify(next));
      setDrafts(next);
      setDraft(d);
      notify("콘텐츠 초안을 브라우저에 저장했어요.");
    } catch {
      notify("초안 저장 실패 · 브라우저 저장 공간을 확인하세요.");
    }
  }
  const field = (key: "input" | "output" | "constraints", label: string) => (
    <label>
      {label}
      <textarea
        rows={2}
        value={draft[key]}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  return (
    <>
      <div className="eyebrow">CONTENT STUDIO</div>
      <div className="page-heading compact">
        <div>
          <h1>콘텐츠 관리</h1>
          <p>강의와 문제를 다듬는 공간. 초안 작성부터 공개 전 검토까지.</p>
        </div>
      </div>
      <div className="info-strip">
        <Shield size={18} />
        관리자 데모 · 모든 데이터는 브라우저에 저장됩니다. 실제 비공개 테스트나
        운영 데이터는 입력하지 마세요.
      </div>
      <div className="admin-layout">
        <aside className="admin-list">
          <button
            className="button primary full"
            onClick={() => {
              setDraft(blank());
              setPreview(false);
              setTab("content");
            }}
          >
            새 콘텐츠 작성 <Plus size={15} />
          </button>
          <h3>
            저장한 콘텐츠 <span>{drafts.length}</span>
          </h3>
          {drafts.length ? (
            drafts.map((d) => (
              <button
                className={
                  "draft-item " + (draft.id === d.id ? "selected" : "")
                }
                key={d.id}
                onClick={() => {
                  setDraft(d);
                  setPreview(false);
                }}
              >
                <small>
                  {d.kind} · {d.state === "DRAFT" ? "초안" : "보관됨"}
                </small>
                <strong>{d.title}</strong>
              </button>
            ))
          ) : (
            <p className="small-muted">첫 초안을 작성해 보세요.</p>
          )}
        </aside>
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            persist(draft);
          }}
        >
          <div className="admin-heading">
            <h2>{draft.id ? "콘텐츠 수정" : "새 콘텐츠 작성"}</h2>
            <span className="badge gray">
              {draft.state === "ARCHIVED" ? "보관됨" : "비공개 초안"}
            </span>
          </div>
          <div className="two-fields">
            <label>
              콘텐츠 유형
              <select
                value={draft.kind}
                onChange={(e) => {
                  change("kind", e.target.value);
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
                maxLength={120}
                value={draft.title}
                onChange={(e) => change("title", e.target.value)}
                placeholder="콘텐츠 제목을 입력하세요"
              />
            </label>
          </div>
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
              <div className="editor-toolbar">
                <span className="small-muted">
                  Markdown · 임의 HTML 및 스크립트는 표시하지 않습니다.
                </span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setPreview(!preview)}
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
                    value={draft.body}
                    onChange={(e) => change("body", e.target.value)}
                    placeholder={
                      "## 학습 목표\n내용을 작성하세요.\n\n```cpp\n// 예제 코드\n```"
                    }
                  />
                </label>
              )}
              {draft.kind === "문제" ? (
                <label>
                  연결 강의
                  <select
                    value={draft.related}
                    onChange={(e) => change("related", e.target.value)}
                  >
                    {lessons.map((l) => (
                      <option key={l.slug} value={l.slug}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <fieldset className="linked-problems">
                  <legend>연결 문제</legend>
                  {problems.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={draft.links.includes(String(p.id))}
                        onChange={(e) =>
                          change(
                            "links",
                            e.target.checked
                              ? [...draft.links, String(p.id)]
                              : draft.links.filter((x) => x !== String(p.id)),
                          )
                        }
                      />
                      {p.id}. {p.title}
                    </label>
                  ))}
                </fieldset>
              )}
            </>
          )}
          {tab === "settings" && (
            <>
              <div className="two-fields">
                <label>
                  난이도
                  <select
                    value={draft.level}
                    onChange={(e) => change("level", e.target.value)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        단계 {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  유형
                  <select
                    value={draft.category}
                    onChange={(e) => change("category", e.target.value)}
                  >
                    {[
                      "입출력",
                      "변수",
                      "조건문",
                      "반복문",
                      "배열",
                      "함수",
                      "STL",
                    ].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              {field("input", "입력 형식")}
              {field("output", "출력 형식")}
              {field("constraints", "제약 조건")}
              <div className="two-fields">
                <label>
                  시간 제한 (ms)
                  <input
                    type="number"
                    min={1}
                    value={draft.time}
                    onChange={(e) => change("time", e.target.value)}
                  />
                </label>
                <label>
                  메모리 제한 (MiB)
                  <input
                    type="number"
                    min={1}
                    value={draft.memory}
                    onChange={(e) => change("memory", e.target.value)}
                  />
                </label>
              </div>
              <label>
                출력 비교 규칙
                <select
                  value={draft.checker}
                  onChange={(e) => change("checker", e.target.value)}
                >
                  <option value="TOKEN">
                    TOKEN · 공백으로 분리한 토큰 비교
                  </option>
                  <option value="EXACT">
                    EXACT · CRLF 정규화 후 정확히 비교
                  </option>
                </select>
              </label>
            </>
          )}
          {tab === "tests" && (
            <>
              <div className="auth-note">
                UI 입력 테스트용입니다. 실제 숨김 테스트는 서버에서만
                저장·관리해야 합니다.
              </div>
              {draft.tests.map((t, i) => (
                <div className="test-case" key={t.id}>
                  <div className="test-case-heading">
                    <strong>테스트 {i + 1}</strong>
                    <label>
                      <input
                        type="checkbox"
                        checked={t.sample}
                        onChange={(e) =>
                          change(
                            "tests",
                            draft.tests.map((x) =>
                              x.id === t.id
                                ? { ...x, sample: e.target.checked }
                                : x,
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
                        value={t.input}
                        onChange={(e) =>
                          change(
                            "tests",
                            draft.tests.map((x) =>
                              x.id === t.id
                                ? { ...x, input: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      기대 출력
                      <textarea
                        value={t.output}
                        onChange={(e) =>
                          change(
                            "tests",
                            draft.tests.map((x) =>
                              x.id === t.id
                                ? { ...x, output: e.target.value }
                                : x,
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
                onClick={() =>
                  change("tests", [
                    ...draft.tests,
                    {
                      id: crypto.randomUUID(),
                      input: "",
                      output: "",
                      sample: true,
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
                  value={draft.reference}
                  onChange={(e) => change("reference", e.target.value)}
                />
              </label>
              <div className="auth-note">
                기준 코드 검증 대기 · 실행 서버가 연결되지 않아 테스트 통과 및
                공개 처리를 제공하지 않습니다.
              </div>
            </>
          )}
          <div className="actions">
            <button className="button primary" type="submit">
              초안 저장
              <Check size={15} />
            </button>
            {draft.id &&
              (draft.state === "DRAFT" ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setArchive(true)}
                >
                  <Archive size={15} />
                  보관
                </button>
              ) : (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => persist({ ...draft, state: "DRAFT" })}
                >
                  <RotateCcw size={15} />
                  초안으로 복원
                </button>
              ))}
            <span className="small-muted">
              저장한 초안은 공개 강의·문제 목록에 반영되지 않습니다.
            </span>
          </div>
        </form>
      </div>
      {archive && (
        <ConfirmDialog
          titleId="archive-title"
          onClose={() => setArchive(false)}
        >
          <h2 id="archive-title">콘텐츠를 보관할까요?</h2>
          <p>초안을 보관 상태로 변경합니다. 나중에 복원할 수 있습니다.</p>
          <div className="actions">
            <button
              autoFocus
              className="button secondary"
              onClick={() => setArchive(false)}
            >
              취소
            </button>
            <button
              className="button primary"
              onClick={() => {
                persist({ ...draft, state: "ARCHIVED" });
                setArchive(false);
              }}
            >
              보관하기
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
