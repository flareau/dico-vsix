import { DiagnosticLike, EntryAst } from "../../types";
import { stripInlineComment } from "../../parser/commentSyntax";

function isIgnoredLine(line: string): boolean {
  const trimmed = stripInlineComment(line).trim();
  return !trimmed;
}

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

  if (!ast.header.lemma || !ast.header.xsampa) {
    return [{
      code: "header.invalid",
      message: "En-tête invalide. Format attendu : signifiant /X-SAMPA/.",
      severity: "error",
      range: ast.header.range
    }];
  }

  const firstContent = ast.rawLines.findIndex((line) => !isIgnoredLine(line));
  if (firstContent !== -1) {
    const afterHeader = ast.rawLines.slice(firstContent + 1);
    const secondLineOffset = afterHeader.findIndex((line) => !isIgnoredLine(line));
    if (secondLineOffset === -1) {
      return [{
        code: "header.grammar.missing",
        message: "Ligne de caractéristiques grammaticales manquante (2e ligne du fichier).",
        severity: "warning",
        range: ast.header.range
      }];
    }

    const secondLineIndex = firstContent + 1 + secondLineOffset;
    const secondTrimmed = stripInlineComment(ast.rawLines[secondLineIndex]).trim();
    if (/^\d+\./u.test(secondTrimmed) || /^(DEF|SEM|TR|FL|EX|REM)\b/u.test(secondTrimmed)) {
      return [{
        code: "header.grammar.invalid",
        message: "La 2e ligne doit contenir les caractéristiques grammaticales du vocable.",
        severity: "warning",
        range: {
          start: { line: secondLineIndex, character: 0 },
          end: { line: secondLineIndex, character: ast.rawLines[secondLineIndex].length }
        }
      }];
    }
    if (!/^[\p{L}\p{N}_ ,.\-()';~#]+$/u.test(secondTrimmed)) {
      return [{
        code: "header.grammar.invalid",
        message: "Caractéristiques grammaticales invalides. Caractères permis: A-Z 0-9 (),.;'-~#",
        severity: "warning",
        range: {
          start: { line: secondLineIndex, character: 0 },
          end: { line: secondLineIndex, character: ast.rawLines[secondLineIndex].length }
        }
      }];
    }
  }

  return [];
}
