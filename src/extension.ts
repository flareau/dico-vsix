import * as vscode from "vscode";
import { registerInspectCurrentFile } from "./commands/inspectCurrentFile";
import { registerShowStructuredData } from "./commands/showStructuredData";
import { registerValidateWorkspace } from "./commands/validateWorkspace";
import { InspectorViewProvider } from "./views/inspectorViewProvider";
import { registerDocumentWatcher } from "./vscode/documentWatcher";

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("dico");
  context.subscriptions.push(diagnostics);

  const inspector = new InspectorViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("dico.inspector", inspector)
  );

  registerDocumentWatcher(context, diagnostics, inspector);
  registerInspectCurrentFile(context, inspector);
  registerShowStructuredData(context);
  registerValidateWorkspace(context);
}

export function deactivate(): void {}
