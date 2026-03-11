import { DiagnosticLike, EntryAst, InspectedEntry } from "../types";

export function inspectEntry(ast: EntryAst, diagnostics: DiagnosticLike[]): InspectedEntry {
  const sections: Record<string, string[]> = {};

  for (const section of ast.sections) {
    sections[section.kind] = [...(sections[section.kind] ?? []), ...section.lines];
  }

  return {
    lemma: ast.header?.lemma ?? null,
    code: ast.header?.code ?? null,
    sections,
    fls: ast.sections.flatMap((section, index) =>
      (section.flCalls ?? []).map((fl) => ({
        name: fl.name,
        value: fl.value,
        sectionIndex: index
      }))
    ),
    annotations: [],
    errors: diagnostics.filter((item) => item.severity === "error").length,
    warnings: diagnostics.filter((item) => item.severity === "warning").length
  };
}
