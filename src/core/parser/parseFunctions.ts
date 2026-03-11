import { FlCallNode } from "../types";
import { LEXICAL_FUNCTION_PATTERNS } from "../lexicalFunctions";
import { stripInlineComment } from "./commentSyntax";

const LF_ATOM_RE = `(?:${LEXICAL_FUNCTION_PATTERNS.join("|")})`;
const SIMPLE_LF_RE = new RegExp(`^(?:${LF_ATOM_RE})+$`, "u");
const LF_LINE_RE =
  /^([+\-]\s*)?((\w+\s*:\s*)?[\w/+\s'\-[\]α~^\{\}]+?)\s*=\s*(\[[~ \w'\-#=.+]+\])?\s*(@?\s*[\w#\-' ~]+?)\s*(\[[~ \w'\-#=.+]+\])?$/u;

function normalizeFn(rawFn: string): string {
  return rawFn.replace(/ *([+:/]) */gu, "$1").trim();
}

function validLfFn(fn: string): boolean {
  const parts = fn
    .split("/")
    .flatMap((chunk) => chunk.split("+"))
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((p) => SIMPLE_LF_RE.test(p));
}

function stripTrailingExample(line: string): string {
  const m = line.match(/^(.*?)(?:\s*"([^"\\]|\\.)*"\s*(?:\(.+?\))?)?$/u);
  return m ? m[1].trim() : line.trim();
}

function parseLfLine(line: string): { fn: string; val: string } | null {
  const core = stripTrailingExample(line);
  const match = core.match(LF_LINE_RE);
  if (!match) return null;

  const rawFn = normalizeFn(match[2] ?? "");
  if (!validLfFn(rawFn)) return null;

  const rawVal = (match[5] ?? "").trim();
  if (!rawVal) return null;

  return { fn: rawFn, val: rawVal };
}

export function parseFunctionsInLines(lines: string[], startLine: number): FlCallNode[] {
  const results: FlCallNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const source = lines[i];
    const line = stripInlineComment(source).trim();
    if (!line) continue;

    const parsed = parseLfLine(line);
    if (!parsed) continue;

    const startChar = source.indexOf(parsed.fn);
    const endChar = startChar === -1 ? source.length : startChar + parsed.fn.length;
    results.push({
      name: parsed.fn,
      value: parsed.val,
      raw: line,
      range: {
        start: { line: startLine + i, character: Math.max(0, startChar) },
        end: { line: startLine + i, character: endChar }
      }
    });
  }

  return results;
}
