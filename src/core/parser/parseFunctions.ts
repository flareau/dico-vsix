import { FlCallNode } from "../types";

const LF_NAME_RE = /\b(Q?(A\d|Able\d|Adv\d|Anti|Bon\d?|Cap|Caus\d|Claus|Cont|Contr|Conv\d{2,}|Copul|Degrad|Epit|Equip|Excess|Fact\d+|Figur|Fin|Func\d+|Gener|Imper|Imperf|Incep|Instr|Involv\d+|Labor\d{2,}|Labreal\d{2,}|Liqu\d?|Locab|Locad|Locin|Magn\d?|Manif|Minus|Mult\d?|Non|Obstr|Oper\d+|Perf|Perm\d+?|Plus|Pred|Prepar|Propt\d|Prox|Qual\d|Real\d+|Redun|Result\d|S\d|Sing|Sinstr|Sloc|Smed|Smod|Son|Sres|Stop|Sympt\d{3}|Syn|V0|Ver))\b/u;
const LF_CALL_RE = new RegExp(`${LF_NAME_RE.source}\\s*\\(([^)]*)\\)`, "gu");

export function parseFunctionsInLines(lines: string[], startLine: number): FlCallNode[] {
  const results: FlCallNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    LF_CALL_RE.lastIndex = 0;

    while ((match = LF_CALL_RE.exec(line)) !== null) {
      const args = match[2]
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      results.push({
        name: match[1],
        args,
        raw: match[0],
        range: {
          start: { line: startLine + i, character: match.index },
          end: { line: startLine + i, character: match.index + match[0].length }
        }
      });
    }
  }

  return results;
}
