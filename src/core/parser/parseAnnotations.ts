import { AnnotationNode } from "../types";
import { makeRange } from "./parseDocument";

const ANNOTATION_RE = /^\s*([%\-+*!])\s?(.*)$/u;

export function parseAnnotations(lines: string[]): AnnotationNode[] {
  const results: AnnotationNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(ANNOTATION_RE);
    if (!match) continue;

    results.push({
      marker: match[1] as AnnotationNode["marker"],
      text: match[2] ?? "",
      range: makeRange(i, 0, lines[i].length)
    });
  }

  return results;
}
