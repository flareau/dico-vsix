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

    const stylesheetUri = this.view.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "inspector.css"),
    );
    const data = this.latest?.inspected;
    if (!data) {
      this.view.webview.html = `
        <html>
          <head>
            <link rel="stylesheet" href="${stylesheetUri}">
          </head>
          <body>
            <p>Aucune fiche analysée.</p>
          </body>
        </html>
      `;
      return;
    }

    this.view.webview.html = `
      <html>
        <head>
          <link rel="stylesheet" href="${stylesheetUri}">
        </head>
        <body>
          <header class="entry-header">
            <h2><span class="lemma">${escapeHtml(data.lemma ?? "??")}</span> /${escapeHtml(data.ipa ?? "??")}/</h2>
            <p class="diagnostics">
              <span>Erreurs: ${data.errors}</span>
              <span>Avertissements: ${data.warnings}</span>
            </p>
          </header>

          <section class="grammar">
            <h3>Traits grammaticaux</h3>
            <p>${data.grammaticalFeatures.length > 0 ? escapeHtml(data.grammaticalFeatures.join(" · ")) : "—"}</p>
          </section>

          <section class="senses">
            <h3>Sens</h3>
            ${data.senses
              .map((sense) => {
                const regimes = sense.regimes
                  .map((regime) => {
                    return `
                      <li class="hover-item">
                        <span>${escapeHtml(regime.pattern)}</span>
                        ${renderExampleTips(regime.examples)}
                      </li>
                    `;
                  })
                  .join("");

                const lexicalFunctions = sense.lexicalFunctions
                  .map((lf) => {
                    const regimeSuffix = lf.regime ? ` [${escapeHtml(lf.regime)}]` : "";
                    return `
                      <li class="hover-item">
                        <span>${escapeHtml(lf.name)} = ${escapeHtml(lf.value)}${regimeSuffix}</span>
                        ${renderExampleTips(lf.examples)}
                      </li>
                    `;
                  })
                  .join("");

                return `
                  <details class="sense">
                    <summary>
                      <span class="sense-number">${escapeHtml(sense.number)}.</span>
                      <span class="sense-short">${escapeHtml(sense.definitionShort)}</span>
                    </summary>
                    <div class="sense-content">
                      <p><strong>Définition:</strong> ${escapeHtml(sense.definition)}</p>
                      <div class="sem-placeholder">
                        <strong>SEM:</strong> ${sense.sem.length > 0 ? escapeHtml(sense.sem.join(" ")) : "visualisation à venir"}
                      </div>
                      <h4>EX</h4>
                      <ul>
                        ${sense.examples
                          .map(
                            (example) => `
                              <li>
                                <span>${escapeHtml(example.text)}</span>
                                ${example.url ? `<a class="src-link" href="${escapeAttr(example.url)}" title="Source" target="_blank" rel="noopener noreferrer">↗</a>` : ""}
                              </li>
                            `,
                          )
                          .join("") || "<li>—</li>"}
                      </ul>
                      <h4>TR</h4>
                      <ul>${regimes || "<li>—</li>"}</ul>
                      <h4>FL</h4>
                      <ul>${lexicalFunctions || "<li>—</li>"}</ul>
                    </div>
                  </details>
                `;
              })
              .join("") || "<p>Aucun sens numéroté détecté.</p>"}
          </section>
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

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function renderExampleTips(examples: Array<{ text: string; url: string | null }>): string {
  if (examples.length === 0) return "";

  return `
    <div class="hover-tip">
      ${examples
        .map(
          (example) => `
            <div class="tip-row">
              <span>${escapeHtml(example.text)}</span>
              ${example.url ? `<a class="src-link" href="${escapeAttr(example.url)}" title="Source" target="_blank" rel="noopener noreferrer">↗</a>` : ""}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}
