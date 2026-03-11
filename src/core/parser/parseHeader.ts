import { HeaderNode } from "../types";
import { makeRange } from "./parseDocument";

const HEADWORD_RE = /^\s*([\w\-\s']+?)\s+\/([A-Za-z0-9:@~]+)\/\s*$/u;

export function parseHeader(lines: string[]): HeaderNode | null {
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (/^[%\-+*!]/u.test(trimmed)) continue;

    const match = lines[i].match(HEADWORD_RE);
    if (!match) {
      return {
        raw: lines[i],
        lemma: null,
        code: null,
        range: makeRange(i, 0, lines[i].length)
      };
    }

    return {
      raw: lines[i],
      lemma: match[1].trim(),
      code: match[2],
      range: makeRange(i, 0, lines[i].length)
    };
  }

  return null;
}
