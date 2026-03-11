import { HeaderNode } from "../types";
import { stripInlineComment } from "./commentSyntax";
import { makeRange } from "./parseDocument";

const HEADWORD_RE = /^\s*([\p{L}\p{N}_\-'\s]+?)\s+\/\s*([A-Za-z0-9:@~.()_\\\s']+)\s*\/\s*$/u;

export function parseHeader(lines: string[]): HeaderNode | null {
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = stripInlineComment(lines[i]).trim();
    if (!trimmed) continue;

    const match = trimmed.match(HEADWORD_RE);
    if (!match) {
      return {
        raw: trimmed,
        lemma: null,
        xsampa: null,
        range: makeRange(i, 0, lines[i].length)
      };
    }

    return {
      raw: trimmed,
      lemma: match[1].trim(),
      xsampa: match[2].replace(/\s+/gu, ""),
      range: makeRange(i, 0, lines[i].length)
    };
  }

  return null;
}
