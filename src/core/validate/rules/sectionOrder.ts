import { DiagnosticLike, EntryAst, SectionKind } from "../../types";

const ORDER: SectionKind[] = ["EX", "DEF", "SEM", "TR", "FL", "REM"];
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

export function validateSectionOrder(ast: EntryAst): DiagnosticLike[] {
  const diagnostics: DiagnosticLike[] = [];
  const highestSeenBySense = new Map<number, number>();

  for (const section of ast.sections) {
    const idx = ORDER.indexOf(section.kind);
    if (idx === -1) continue;

    const sense = getSenseIndex(ast, section.range.start.line);
    const highestSeen = highestSeenBySense.get(sense) ?? -1;

    if (idx < highestSeen) {
      diagnostics.push({
        code: "section.order",
        message: `Ordre inhabituel des sections : ${section.kind}.`,
        severity: "info",
        range: section.range
      });
    } else {
      highestSeenBySense.set(sense, idx);
    }
  }

  return diagnostics;
}
