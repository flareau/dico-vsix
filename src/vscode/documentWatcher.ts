import * as vscode from "vscode";
import { analyzeDocument } from "../core/analyzer";
import { InspectorViewProvider } from "../views/inspectorViewProvider";
import { toVsDiagnostics } from "./diagnostics";

export function registerDocumentWatcher(
  context: vscode.ExtensionContext,
  collection: vscode.DiagnosticCollection,
  inspector: InspectorViewProvider
): void {
  const refresh = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== "dico") return;

    const result = analyzeDocument(doc.getText());
    collection.set(doc.uri, toVsDiagnostics(result.diagnostics));
    inspector.update(result);
  };

  if (vscode.window.activeTextEditor) {
    refresh(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((event) => refresh(event.document)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) refresh(editor.document);
    })
  );
}
