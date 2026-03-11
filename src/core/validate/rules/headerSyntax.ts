import { DiagnosticLike, EntryAst } from "../../types";

export function validateHeaderSyntax(ast: EntryAst): DiagnosticLike[] {
  if (!ast.header) {
    return [{
      code: "header.missing",
      message: "En-tête de fiche absent.",
      severity: "error",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 }
      }
    }];
  }

  if (!ast.header.lemma || !ast.header.code) {
    return [{
      code: "header.invalid",
      message: "En-tête invalide. Format attendu : lemme /CODE/.",
      severity: "error",
      range: ast.header.range
    }];
  }

  return [];
}
