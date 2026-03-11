import { DiagnosticLike, EntryAst } from "../../types";

const REQUIRED = ["DEF", "SEM"];

export function validateRequiredSections(ast: EntryAst): DiagnosticLike[] {
  const found = new Set(ast.sections.map((section) => section.kind));
  const diagnostics: DiagnosticLike[] = [];

  for (const kind of REQUIRED) {
    if (!found.has(kind as typeof ast.sections[number]["kind"])) {
      diagnostics.push({
        code: "section.required",
        message: `Section obligatoire manquante : ${kind}.`,
        severity: "warning",
        range: ast.header?.range ?? {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 }
        }
      });
    }
  }

  return diagnostics;
}
