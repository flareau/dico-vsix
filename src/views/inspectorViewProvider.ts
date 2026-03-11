import * as vscode from "vscode";
import { LEXICAL_FUNCTION_PATTERNS } from "../core/lexicalFunctions";
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
            <p class="diagnostics">
              <span>Erreurs: ${data.errors}</span>
              <span>Avertissements: ${data.warnings}</span>
            </p>
            <h2><span class="lemma">${escapeHtml(data.lemma ?? "??")}</span> /${escapeHtml(data.ipa ?? "??")}/</h2>
            <section class="grammar">
              <p>${data.grammaticalFeatures.length > 0 ? escapeHtml(data.grammaticalFeatures.join(" · ")) : "—"}</p>
            </section>
          </header>

          <section class="senses">
            ${data.senses
              .map((sense) => {
                const regimes = sense.regimes
                  .map((regime) => {
                    return `
                      <li class="hover-item status-${regime.status}">
                        <span>${renderDicoText(regime.pattern)}</span>
                        ${renderExampleTips(regime.examples)}
                        ${renderAnnotations(regime.annotations)}
                      </li>
                    `;
                  })
                  .join("");

                const lexicalFunctions = sense.lexicalFunctions
                  .map((lf) => {
                    const regimeSuffix =
                      lf.regimePost
                        ? ` <span class="lf-regime">[${renderDicoText(lf.regimePost)}]</span>`
                        : lf.regimePre
                          ? ` <span class="lf-regime">[${renderDicoText(lf.regimePre)}]</span>`
                          : "";
                    return `
                      <li class="hover-item status-${lf.status}">
                        <span><span class="lf-name">${renderLfName(lf.name)}</span> = ${renderDicoText(lf.value)}${regimeSuffix}</span>
                        ${renderExampleTips(lf.examples)}
                        ${renderAnnotations(lf.annotations)}
                      </li>
                    `;
                  })
                  .join("");

                return `
                  <details class="sense">
                    <summary>
                      <span class="sense-number">${escapeHtml(sense.number)}.</span>
                      <span class="sense-short">${renderDicoText(sense.definitionShort)}</span>
                    </summary>
                    <div class="sense-content">
                      ${
                        sense.rem.length > 0
                          ? `<p><strong>REM:</strong> ${renderDicoText(sense.rem.join(" · "))}</p>`
                          : ""
                      }
                      <p>
                        ${sense.definition
                          ? `${renderDicoText(sense.definition.definiendum)} = ${renderDicoText(sense.definition.definiens || "…")}`
                          : "—"}
                      </p>
                      ${sense.definition ? renderAnnotations(sense.definition.annotations) : ""}
                      <div class="sem-placeholder">
                        ${
                          sense.sem
                            ? `${renderDicoText(sense.sem.definiendum)} = ${renderDicoText(sense.sem.definiens || "…")}${
                                sense.sem.conditions ? ` | ${renderDicoText(sense.sem.conditions)}` : ""
                              }`
                            : "visualisation à venir"
                        }
                        ${sense.sem ? renderAnnotations(sense.sem.annotations) : ""}
                      </div>
                      <h4>Exemples</h4>
                      <ul>
                        ${sense.examples
                          .map(
                            (example) => `
                              <li class="status-${example.status}">
                                <span>${escapeHtml(example.text)}</span>
                                ${renderSourceIndicator(example)}
                                ${renderAnnotations(example.annotations)}
                              </li>
                            `,
                          )
                          .join("") || "<li>—</li>"}
                      </ul>
                      <h4>Régime</h4>
                      <ul>${regimes || "<li>—</li>"}</ul>
                      <h4>Relations lexicales</h4>
                      <ul>${lexicalFunctions || "<li>—</li>"}</ul>
                    </div>
                  </details>
                `;
              })
              .join("") || "<p>Aucune acception.</p>"}
          </section>
        </body>
      </html>
    `;
  }
}

const LF_SUPERSCRIPT_REGEXES = LEXICAL_FUNCTION_PATTERNS
  .filter((pattern) => pattern.startsWith("--"))
  .map((pattern) => pattern.slice(2))
  .map((pattern) => new RegExp(`--(${pattern})\\b`, "gu"));

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function renderDicoText(value: string): string {
  const chunks: string[] = [];
  const put = (html: string): string => {
    chunks.push(html);
    return `@@${chunks.length - 1}@@`;
  };

  const withTokens = escapeHtml(value)
    .replace(/#(\d+)/g, (_m, n: string) => put(`<sub class="sense-index">${n}</sub>`))
    .replace(/~/g, () => put('<span class="self-token">~</span>'))
    .replace(/\b([XYZABC])(\d*)\b/gu, (_m, letter: string, index: string) => {
      const token = `${letter}${index}`;
      return put(`<span class="var-token">${token}</span>`);
    })
    .replace(/\bLocin\b/gu, (lf: string) => put(`<span class="lf-name">${lf}</span>`))
    .replace(/\b(Adj|Adv|N|V|Dét|Det|Prep|Pron)\b/gu, (tag: string) => {
      return put(`<span class="pos-token">${tag}</span>`);
    });

  return withTokens
    .replace(/@@(\d+)@@/g, (_m, i: string) => chunks[Number(i)] ?? _m)
    .replace(/@(?=[\p{L}\p{N}_#-])/gu, '<span class="at-token">@</span>');
}

function renderLfName(value: string): string {
  let html = renderDicoText(value);
  for (const regex of LF_SUPERSCRIPT_REGEXES) {
    html = html.replace(regex, (_m, feature: string) => `<sup class="lf-sup">${feature}</sup>`);
  }
  html = html
    .replace(/([A-Za-z])(\d+)\b/gu, (_m, base: string, n: string) => `${base}<sub class="lf-sub">${n}</sub>`)
    .replace(/α/gu, '<sub class="lf-sub">α</sub>');
  return html;
}

function renderExampleTips(
  examples: Array<{
    status: "valid" | "missing" | "invalid";
    text: string;
    url: string | null;
    web: boolean;
    annotations: Array<{ marker: "*" | "!"; penalty: number; target: "item" | "example"; text: string }>;
  }>,
): string {
  if (examples.length === 0) return "";

  return `
    <div class="hover-tip">
      ${examples
        .map(
          (example) => `
            <div class="tip-row status-${example.status}">
              <span>${escapeHtml(example.text)}</span>
              ${renderSourceIndicator(example)}
              ${renderAnnotations(example.annotations)}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAnnotations(annotations: Array<{ marker: "*" | "!"; penalty: number; target: "item" | "example"; text: string }>): string {
  if (annotations.length === 0) return "";
  return `
    <div class="annotations">
      ${annotations
        .map((annotation) => {
          const prefix = annotation.marker === "!" ? "!".repeat(Math.max(1, annotation.penalty)) : "*";
          const kindClass = annotation.marker === "!" ? "annotation-error" : "annotation-comment";
          return `<div class="annotation ${kindClass}" title="Cible: ${annotation.target}">${escapeHtml(prefix)} ${escapeHtml(annotation.text)}</div>`;
        })
        .join("")}
    </div>
  `;
}

function renderSourceIndicator(example: {
  url: string | null;
  web: boolean;
}): string {
  if (example.url && example.web) {
    return `<a class="src-link" href="${escapeAttr(example.url)}" title="Source" target="_blank" rel="noopener noreferrer">↗</a>`;
  }

  const isInvented = Boolean(example.url && /^invent[ée]$/iu.test(example.url.trim()));
  const title = isInvented ? "Exemple inventé" : "Source manquante";
  return `<span class="src-missing" title="${title}">✖</span>`;
}
