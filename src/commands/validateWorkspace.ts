import * as vscode from "vscode";
import { analyzeDocument } from "../core/analyzer";

export function registerValidateWorkspace(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("dico.validateWorkspace", async () => {
      const files = await vscode.workspace.findFiles("**/*.dico");
      let fileCount = 0;
      let errorCount = 0;
      let warningCount = 0;

      for (const uri of files) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const result = analyzeDocument(doc.getText());
        fileCount += 1;
        errorCount += result.diagnostics.filter((d) => d.severity === "error").length;
        warningCount += result.diagnostics.filter((d) => d.severity === "warning").length;
      }

      void vscode.window.showInformationMessage(
        `Validation terminée : ${fileCount} fichier(s), ${errorCount} erreur(s), ${warningCount} avertissement(s).`
      );
    })
  );
}
