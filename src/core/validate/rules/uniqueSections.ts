import { DiagnosticLike, EntryAst } from "../../types";

const UNIQUE = new Set(["REM", "EX", "DEF", "SEM", "TR", "FL"]);
const NUMBER_RE = /^\s*\d+\./u;

function getSenseIndex(ast: EntryAst, line: number): number {
  let sense = 0;
  for (let i = 0; i <= line && i < ast.rawLines.length; i += 1) {
    if (NUMBER_RE.test(ast.rawLines[i])) {
      sense += 1;
    }
  }
  return sense;
}

export function validateUniqueSections(ast: EntryAst): DiagnosticLike[] {
  const counts = new Map<string, number>();
  const diagnostics: DiagnosticLike[] = [];

  for (const section of ast.sections) {
    const sense = getSenseIndex(ast, section.range.start.line);
    const key = `${sense}:${section.kind}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);

    if (UNIQUE.has(section.kind) && (counts.get(key) ?? 0) > 1) {
      diagnostics.push({
        code: "section.duplicate",
        message: `Section ${section.kind} dupliquée.`,
        severity: "warning",
        range: section.range
      });
    }
  }

  return diagnostics;
}
