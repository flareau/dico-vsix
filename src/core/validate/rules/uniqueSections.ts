import { DiagnosticLike, EntryAst } from "../../types";

const UNIQUE = new Set(["DEF", "SEM", "TR", "REM"]);

export function validateUniqueSections(ast: EntryAst): DiagnosticLike[] {
  const counts = new Map<string, number>();
  const diagnostics: DiagnosticLike[] = [];

  for (const section of ast.sections) {
    counts.set(section.kind, (counts.get(section.kind) ?? 0) + 1);

    if (UNIQUE.has(section.kind) && (counts.get(section.kind) ?? 0) > 1) {
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
