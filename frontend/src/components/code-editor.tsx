"use client";
import Editor, { loader } from "@monaco-editor/react";
loader.config({ paths: { vs: "/monaco/vs" } });
export default function CodeEditor({
  value,
  onChange,
  fontSize,
}: {
  value: string;
  onChange: (value: string | undefined) => void;
  fontSize: number;
}) {
  return (
    <Editor
      height="420px"
      language="cpp"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      loading={
        <div className="editor-loading">C++ 에디터를 준비하고 있어요…</div>
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
        ariaLabel: "C++ 코드 에디터",
        wordWrap: "on",
      }}
    />
  );
}
