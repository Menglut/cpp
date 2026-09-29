import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";

const require = createRequire(import.meta.url);
let monacoRoot = dirname(require.resolve("monaco-editor"));
while (basename(monacoRoot) !== "monaco-editor") {
  const parent = dirname(monacoRoot);
  if (parent === monacoRoot) throw new Error("Could not locate the monaco-editor package root");
  monacoRoot = parent;
}
const publicRoot = new URL("../public/monaco/", import.meta.url);

mkdirSync(publicRoot, { recursive: true });
cpSync(join(monacoRoot, "min/vs"), new URL("vs", publicRoot), {
  recursive: true,
});
