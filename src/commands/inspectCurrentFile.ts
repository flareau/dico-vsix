import * as vscode from "vscode";
import { analyzeDocument } from "../core/analyzer";
import { InspectorViewProvider } from "../views/inspectorViewProvider";

export function registerInspectCurrentFile(
  context: vscode.ExtensionContext,
  inspector: InspectorViewProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("dico.inspectCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "dico") {
        void vscode.window.showWarningMessage("Aucune fiche DICO active.");
        return;
      }

      const result = analyzeDocument(editor.document.getText());
      inspector.update(result);
      void vscode.window.showInformationMessage("Fiche inspectée.");
    })
  );
}
