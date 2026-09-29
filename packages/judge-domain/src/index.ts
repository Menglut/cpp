export type CompareOptions = {
  comparator: "TOKEN" | "EXACT";
  allowFinalNewline?: boolean;
};

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function compareOutput(actual: string, expected: string, options: CompareOptions): boolean {
  if (options.comparator === "TOKEN") {
    const tokenize = (value: string) => value.trim().split(/[ \t\r\n]+/).filter(Boolean);
    const actualTokens = tokenize(actual);
    const expectedTokens = tokenize(expected);
    return (
      actualTokens.length === expectedTokens.length &&
      actualTokens.every((token, index) => token === expectedTokens[index])
    );
  }

  let normalizedActual = normalizeNewlines(actual);
  let normalizedExpected = normalizeNewlines(expected);
  if (options.allowFinalNewline ?? true) {
    normalizedActual = normalizedActual.replace(/\n$/, "");
    normalizedExpected = normalizedExpected.replace(/\n$/, "");
  }
  return normalizedActual === normalizedExpected;
}
