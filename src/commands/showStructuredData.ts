import * as vscode from "vscode";
import { analyzeDocument } from "../core/analyzer";

type OutputMode = "analysis" | "ast";

function getStructuredPayload(mode: OutputMode, text: string): unknown {
  const result = analyzeDocument(text);
  if (mode === "ast") return result.ast;
  return result;
}

export function registerShowStructuredData(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("dico.showStructuredData", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "dico") {
        void vscode.window.showWarningMessage("Aucune fiche DICO active.");
        return;
      }

      const picked = await vscode.window.showQuickPick(
        [
          { label: "AnalysisResult (JSON)", mode: "analysis" as OutputMode },
          { label: "AST only (JSON)", mode: "ast" as OutputMode }
        ],
        {
          title: "Afficher les données structurées",
          placeHolder: "Choisir le format de sortie"
        }
      );
      if (!picked) return;

      const payload = getStructuredPayload(picked.mode, editor.document.getText());
      const json = JSON.stringify(payload, null, 2);
      const label = picked.mode === "ast" ? "dico-ast.json" : "dico-analysis.json";

      const doc = await vscode.workspace.openTextDocument({
        language: "json",
        content: json
      });

      await vscode.window.showTextDocument(doc, { preview: false });
      void vscode.window.showInformationMessage(`Données structurées ouvertes (${label}).`);
    })
  );
}
