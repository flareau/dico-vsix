import { SectionKind, SectionNode } from "../types";
import { stripInlineComment } from "./commentSyntax";
import { makeRange } from "./parseDocument";
import { parseFunctionsInLines } from "./parseFunctions";

const SECTION_RE = /^\s*(DEF|SEM|TR|FL|EX|REM)\b/u;
const NUMBER_RE = /^\s*(\d+)\.\s*$/u;
const NUMBER_WITH_SECTION_RE = /^\s*(\d+)\.\s*(DEF|SEM|TR|FL|EX|REM)\s*$/u;
const RUN_IN_SECTION_RE = /^\s*(DEF|SEM|TR|FL|EX|REM)\s+(.+)$/u;

function toSectionKind(value: string): SectionKind {
  switch (value) {
    case "DEF":
    case "SEM":
    case "TR":
    case "FL":
    case "EX":
    case "REM":
      return value;
    default:
      return "UNKNOWN";
  }
}

export function parseSections(lines: string[]): SectionNode[] {
  const sections: SectionNode[] = [];
  let current: SectionNode | null = null;
  let currentStart = -1;

  const pushCurrent = (endLine: number): void => {
    if (!current) return;

    current.range = {
      start: { line: currentStart, character: 0 },
      end: { line: Math.max(endLine, currentStart), character: lines[Math.max(endLine, currentStart)]?.length ?? 0 }
    };

    if (current.kind === "FL") {
      current.flCalls = parseFunctionsInLines(current.lines, currentStart + 1);
    }

    sections.push(current);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const canon = stripInlineComment(line).replace(/\s+/gu, " ").trim();

    if (!canon) continue;
    if (/^[*!]/u.test(canon)) continue;

    if (NUMBER_RE.test(canon)) continue;

    const numSection = canon.match(NUMBER_WITH_SECTION_RE);
    if (numSection) {
      if (current) pushCurrent(i - 1);
      currentStart = i;
      current = {
        kind: toSectionKind(numSection[2]),
        titleRaw: numSection[2],
        lines: [],
        range: makeRange(i, 0, line.length)
      };
      continue;
    }

    const runIn = canon.match(RUN_IN_SECTION_RE);
    if (runIn) {
      if (current) pushCurrent(i - 1);
      currentStart = i;
      current = {
        kind: toSectionKind(runIn[1]),
        titleRaw: runIn[1],
        lines: [runIn[2]],
        range: makeRange(i, 0, line.length)
      };
      continue;
    }

    const match = canon.match(SECTION_RE);
    if (match) {
      if (current) pushCurrent(i - 1);
      currentStart = i;
      current = {
        kind: toSectionKind(match[1]),
        titleRaw: match[1],
        lines: [],
        range: makeRange(i, 0, line.length)
      };
      continue;
    }

    if (current) {
      const withoutComment = canon;
      current.lines.push(withoutComment);
    }
  }

  if (current) pushCurrent(lines.length - 1);

  return sections;
}
