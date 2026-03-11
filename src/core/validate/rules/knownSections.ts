import { DiagnosticLike, EntryAst } from "../../types";

const KNOWN = new Set(["DEF", "SEM", "TR", "FL", "EX", "REM"]);

export function validateKnownSections(ast: EntryAst): DiagnosticLike[] {
  const diagnostics: DiagnosticLike[] = [];

  for (const section of ast.sections) {
    if (!KNOWN.has(section.kind)) {
      diagnostics.push({
        code: "section.unknown",
        message: `Section inconnue : ${section.titleRaw}.`,
        severity: "warning",
        range: section.range
      });
    }
  }

  return diagnostics;
}
