"use client";

import { useEffect, useRef, useState } from "react";
import type { Crepe } from "@milkdown/crepe";

export default function VisualMarkdownEditor({
  value,
  documentKey,
  disabled = false,
  onChange,
}: {
  value: string;
  documentKey: string;
  disabled?: boolean;
  onChange: (markdown: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Crepe | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;
    editorRef.current?.setReadonly(disabled);
  }, [disabled]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let disposed = false;
    let crepe: Crepe | null = null;
    setError(null);
    setLoading(true);

    void import("@milkdown/crepe")
      .then(async ({ Crepe, CrepeFeature }) => {
        if (disposed) return;
        crepe = new Crepe({
          root,
          defaultValue: value,
          features: {
            [CrepeFeature.Latex]: false,
            [CrepeFeature.AI]: false,
          },
          featureConfigs: {
            [CrepeFeature.Placeholder]: {
              text: "본문을 입력하세요. '/'를 누르면 제목, 목록, 표 등을 선택할 수 있습니다.",
            },
          },
        });
        crepe.on((listener) => {
          listener.markdownUpdated((_context, markdown, previousMarkdown) => {
            if (markdown !== previousMarkdown) onChangeRef.current(markdown);
          });
        });
        editorRef.current = crepe;
        await crepe.create();
        if (disposed) {
          await crepe.destroy();
          return;
        }
        crepe.setReadonly(disabledRef.current);
        setLoading(false);
      })
      .catch(() => {
        if (!disposed) {
          setError(
            "시각적 편집기를 불러오지 못했습니다. Markdown 원문 모드를 이용해 주세요.",
          );
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
      editorRef.current = null;
      if (crepe) void crepe.destroy();
      root.replaceChildren();
    };
  }, [documentKey]);

  return (
    <div className="visual-markdown-editor">
      {loading && (
        <div className="visual-editor-status">편집기를 준비하고 있습니다…</div>
      )}
      {error && <div className="visual-editor-error">{error}</div>}
      <div ref={rootRef} />
    </div>
  );
}
