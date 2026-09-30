"use client";
import Editor, { loader } from "@monaco-editor/react";
loader.config({ paths: { vs: "/monaco/vs" } });
export default function CodeEditor({
  value,
  onChange,
  fontSize,
  language,
}: {
  value: string;
  onChange: (value: string | undefined) => void;
  fontSize: number;
  language: "c" | "cpp";
}) {
  return (
    <Editor
      height="420px"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={onChange}
      loading={
        <div className="editor-loading">
          {language === "c" ? "C" : "C++"} 에디터를 준비하고 있어요…
        </div>
      }
      options={{
        fontSize,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 22 },
        lineNumbersMinChars: 3,
        tabSize: 4,
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        ariaLabel: `${language === "c" ? "C" : "C++"} 코드 에디터`,
        wordWrap: "on",
      }}
    />
  );
}
