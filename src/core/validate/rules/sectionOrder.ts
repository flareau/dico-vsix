import { DiagnosticLike, EntryAst, SectionKind } from "../../types";

const ORDER: SectionKind[] = ["DEF", "SEM", "TR", "FL", "EX", "REM"];

export function validateSectionOrder(ast: EntryAst): DiagnosticLike[] {
  const diagnostics: DiagnosticLike[] = [];
  let highestSeen = -1;

  for (const section of ast.sections) {
    const idx = ORDER.indexOf(section.kind);
    if (idx === -1) continue;
    if (idx < highestSeen) {
      diagnostics.push({
        code: "section.order",
        message: `Ordre inhabituel des sections : ${section.kind}.`,
        severity: "info",
        range: section.range
      });
    } else {
      highestSeen = idx;
    }
  }

  return diagnostics;
}
