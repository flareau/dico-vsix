import { DiagnosticLike, EntryAst } from "../../types";

export function validateAnnotationMarkers(ast: EntryAst): DiagnosticLike[] {
  return ast.annotations
    .filter((annotation) => annotation.marker === "!")
    .map((annotation) => ({
      code: "annotation.blocking",
      message: "Marqueur bloquant présent dans la fiche.",
      severity: "warning" as const,
      range: annotation.range
    }));
}
