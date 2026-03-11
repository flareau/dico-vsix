import * as vscode from "vscode";
import { DiagnosticLike } from "../core/types";

export function toVsDiagnostics(items: DiagnosticLike[]): vscode.Diagnostic[] {
  return items.map((item) => {
    const range = new vscode.Range(
      new vscode.Position(item.range.start.line, item.range.start.character),
      new vscode.Position(item.range.end.line, item.range.end.character)
    );

    const severity =
      item.severity === "error"
        ? vscode.DiagnosticSeverity.Error
        : item.severity === "warning"
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;

    const diagnostic = new vscode.Diagnostic(range, item.message, severity);
    diagnostic.code = item.code;
    return diagnostic;
  });
}
