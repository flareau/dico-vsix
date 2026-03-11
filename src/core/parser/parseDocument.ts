import { EntryAst, Range } from "../types";
import { parseAnnotations } from "./parseAnnotations";
import { parseHeader } from "./parseHeader";
import { parseSections } from "./parseSections";

export function parseDocument(text: string): EntryAst {
  const rawLines = text.split(/\r?\n/);

  return {
    header: parseHeader(rawLines),
    sections: parseSections(rawLines),
    annotations: parseAnnotations(rawLines),
    rawLines
  };
}

export function makeRange(line: number, startChar: number, endChar: number): Range {
  return {
    start: { line, character: startChar },
    end: { line, character: endChar }
  };
}
