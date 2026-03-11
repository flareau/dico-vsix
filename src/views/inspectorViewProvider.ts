import * as vscode from "vscode";
import { AnalysisResult } from "../core/types";

export class InspectorViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private latest?: AnalysisResult;

  constructor(private readonly extensionUri: vscode.Uri) {
    void this.extensionUri;
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    this.render();
  }

  update(result: AnalysisResult): void {
    this.latest = result;
    this.render();
  }

  private render(): void {
    if (!this.view) return;

    const data = this.latest?.compiled;
    if (!data) {
      this.view.webview.html = "<html><body><p>Aucune fiche analysée.</p></body></html>";
      return;
    }

    this.view.webview.html = `
      <html>
        <body>
          <h2>${escapeHtml(data.lemma ?? "(sans lemme)")}</h2>
          <p><strong>Code :</strong> ${escapeHtml(data.code ?? "—")}</p>
          <p><strong>Erreurs :</strong> ${data.errors}</p>
          <p><strong>Avertissements :</strong> ${data.warnings}</p>

          <h3>Sections</h3>
          <ul>
            ${Object.entries(data.sections)
              .map(([key, value]) => `<li><strong>${escapeHtml(key)}</strong> : ${value.length} ligne(s)</li>`)
              .join("")}
          </ul>

          <h3>Fonctions lexicales</h3>
          <ul>
            ${data.fls
              .map((fl) => `<li>${escapeHtml(fl.name)}(${escapeHtml(fl.value)})</li>`)
              .join("")}
          </ul>

          <h3>Annotations</h3>
          <ul>
            ${data.annotations
              .map((annotation) => `<li>${escapeHtml(annotation.marker)} ${escapeHtml(annotation.text)}</li>`)
              .join("")}
          </ul>
        </body>
      </html>
    `;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
