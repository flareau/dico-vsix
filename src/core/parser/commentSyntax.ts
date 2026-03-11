export function stripInlineComment(line: string): string {
  const protectedLine = line
    .replace(/\\"/gu, "<PROTECTED:ESCAPED-QUOTE>")
    .replace(/\\\(/gu, "<PROTECTED:ESCAPED-OPEN-PAREN>")
    .replace(/\\\)/gu, "<PROTECTED:ESCAPED-CLOSE-PAREN>")
    .replace(/\\%/gu, "<PROTECTED:ESCAPED-PERCENT>");

  let safe = protectedLine;
  safe = safe.replace(/"[^"]*"/gu, (m) => m.replace(/%/gu, "<PROTECTED:PERCENT>"));
  safe = safe.replace(/\(\s*https?:\/\/\S+\s*\)/giu, (m) => m.replace(/%/gu, "<PROTECTED:PERCENT>"));

  const idx = safe.indexOf("%");
  const withoutComment = (idx === -1 ? safe : safe.slice(0, idx)).trimEnd();

  return withoutComment
    .replace(/<PROTECTED:ESCAPED-QUOTE>/gu, "\\\"")
    .replace(/<PROTECTED:ESCAPED-OPEN-PAREN>/gu, "\\(")
    .replace(/<PROTECTED:ESCAPED-CLOSE-PAREN>/gu, "\\)")
    .replace(/<PROTECTED:ESCAPED-PERCENT>/gu, "\\%")
    .replace(/<PROTECTED:PERCENT>/gu, "%");
}
