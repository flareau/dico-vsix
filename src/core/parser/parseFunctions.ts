import { FlCallNode } from "../types";
import { stripInlineComment } from "./commentSyntax";

const SIMPLE_LFS = [
  "\\[Magn",
  "Qual1\\]",
  "f",
  "\\{[^{}]+?\\}",
  "Q",
  "Syn",
  "Anti",
  "Non",
  "Conv[1-9]{2,}",
  "Gener",
  "Figur",
  "Contr",
  "S0",
  "V0",
  "A0",
  "Adv0",
  "Claus",
  "Pred",
  "S[1-9]",
  "Equip",
  "Cap",
  "S_?(instr|med|mod|loc|res)",
  "A[1-9]",
  "Able[1-9]",
  "Qual[1-9]",
  "Adv[1-9]",
  "Sing",
  "Mult",
  "Imper",
  "Perf",
  "Imperf",
  "Result[1-9]",
  "Germ",
  "Culm",
  "Epit",
  "Redun",
  "Magn",
  "Magn[1-9]",
  "--quant",
  "--temp",
  "Ver",
  "Bon2?",
  "Degrad",
  "Plus",
  "Minus",
  "Loc_?(in|ad|ab)",
  "Instr",
  "Propt[1-9]",
  "Copul",
  "Oper(\\d|[1-9]+(\\+[1-9]+)?)",
  "Func(\\d|[1-9]+(\\+[1-9]+)?)",
  "Labor[1-9]{2}",
  "Real(\\d|[1-9]+(\\+[1-9]+)?)",
  "Fact(\\d|[1-9]+(\\+[1-9]+)?)",
  "Labreal[1-9α]{2}",
  "Prepar",
  "Incep",
  "Fin",
  "Cont",
  "Prox",
  "Obstr",
  "Stop",
  "Excess",
  "Caus([1-9α](\\+[1-9])?)?",
  "Liqu([1-9α](\\+[1-9])?)?",
  "Perm([1-9α](\\+[1-9])?)?",
  "Son",
  "Manif",
  "Involv",
  "--Sympt[1-3]{2,3}"
];

const SIMPLE_LF_RE = new RegExp(`^(${SIMPLE_LFS.join("|")})+$`, "u");

function normalizeFn(rawFn: string): string {
  return rawFn.replace(/ *([+/:]) */gu, "$1").trim();
}

function validLfFn(fn: string): boolean {
  const parts = fn.split("/").flatMap((chunk) => chunk.split("+")).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((p) => SIMPLE_LF_RE.test(p));
}

function stripTrailingExample(line: string): string {
  const m = line.match(/^(.*?)(?:\s*"([^"\\]|\\.)*"\s*(?:\(.+?\))?)?$/u);
  return m ? m[1].trim() : line.trim();
}

function parseLfLine(line: string): { fn: string; val: string } | null {
  const core = stripTrailingExample(line);
  const match = core.match(/^([+\-]\s*)?(.+?)\s*=\s*(.+)$/u);
  if (!match) return null;

  const rawFn = normalizeFn(match[2]).replace(/^\w+:/u, "");
  if (!validLfFn(rawFn)) return null;

  let rhs = (match[3] ?? "").trim();
  rhs = rhs.replace(/^\[[^\]]+\]\s*/u, "").trim();
  rhs = rhs.replace(/\s*\[[^\]]+\]\s*$/u, "").trim();
  if (!rhs) return null;

  const rawVal = rhs.replace(/^@\s*/u, "").replace(/\s+/gu, " ").trim();
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
      args: [parsed.val],
      raw: line,
      range: {
        start: { line: startLine + i, character: Math.max(0, startChar) },
        end: { line: startLine + i, character: endChar }
      }
    });
  }

  return results;
}
