import { DiagnosticLike, EntryAst, InspectedEntry } from "../types";
import { stripInlineComment } from "../parser/commentSyntax";

const SECTION_RE = /^\s*(DEF|SEM|TR|FL|EX|REM)\b/u;
const NUMBER_RE = /^\s*(\d+)\.\s*$/u;
const NUMBER_WITH_SECTION_RE = /^\s*(\d+)\.\s*(DEF|SEM|TR|FL|EX|REM)\s*$/u;
const RUN_IN_SECTION_RE = /^\s*(DEF|SEM|TR|FL|EX|REM)\s+(.+)$/u;

type SenseSectionKind = "DEF" | "SEM" | "TR" | "FL" | "EX" | "REM";

interface SenseBuilder {
  number: string;
  sections: Record<SenseSectionKind, string[]>;
}

interface ExampleTip {
  text: string;
  url: string | null;
}

function createSense(number: string): SenseBuilder {
  return {
    number,
    sections: { DEF: [], SEM: [], TR: [], FL: [], EX: [], REM: [] }
  };
}

function normalizeLine(line: string): string {
  return stripInlineComment(line).replace(/\s+/gu, " ").trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function parseExampleTips(line: string): ExampleTip[] {
  const results: ExampleTip[] = [];
  const matches = line.matchAll(/"((?:[^"\\]|\\.)*)"\s*(?:\((https?:\/\/[^)\s]+[^)]*)\))?/gu);

  for (const match of matches) {
    const text = (match[1] ?? "").trim();
    if (!text) continue;
    results.push({
      text,
      url: match[2]?.trim() ?? null
    });
  }

  return results;
}

function withoutQuotedSegments(line: string): string {
  return line.replace(/"((?:[^"\\]|\\.)*)"/gu, "").replace(/\(\s*https?:\/\/\S+\s*\)/giu, "").trim();
}

function parseRegimeLine(line: string): { pattern: string; examples: ExampleTip[] } {
  const examples = parseExampleTips(line);
  const pattern = withoutQuotedSegments(line) || line;
  return { pattern: pattern.trim(), examples };
}

function parseLexicalFunctionLine(line: string): { name: string; value: string; regime: string | null; examples: ExampleTip[] } {
  const examples = parseExampleTips(line);
  const core = withoutQuotedSegments(line);
  const match = core.match(/^(.*?)\s*=\s*(.*?)\s*(\[[^[\]]+\])?\s*$/u);
  if (!match) {
    return { name: core, value: "", regime: null, examples };
  }

  const name = (match[1] ?? "").replace(/^[+\-]\s*/u, "").trim();
  const value = (match[2] ?? "").trim();
  const regimeRaw = match[3]?.trim();
  const regime = regimeRaw ? regimeRaw.slice(1, -1).trim() : null;

  return { name, value, regime, examples };
}

function buildSenses(ast: EntryAst): { grammaticalFeatures: string[]; senses: InspectedEntry["senses"] } {
  const grammaticalFeatures: string[] = [];
  const senseBuilders: SenseBuilder[] = [];
  let currentSense: SenseBuilder | null = null;
  let currentSection: SenseSectionKind | null = null;

  for (let i = 0; i < ast.rawLines.length; i += 1) {
    const canon = normalizeLine(ast.rawLines[i]);
    if (!canon) continue;
    if (canon === ast.header?.raw) continue;
    if (/^[*!]/u.test(canon)) continue;

    const numberedSection = canon.match(NUMBER_WITH_SECTION_RE);
    if (numberedSection) {
      const nextSense = createSense(numberedSection[1]);
      senseBuilders.push(nextSense);
      currentSense = nextSense;
      currentSection = numberedSection[2] as SenseSectionKind;
      continue;
    }

    const senseMatch = canon.match(NUMBER_RE);
    if (senseMatch) {
      const nextSense = createSense(senseMatch[1]);
      senseBuilders.push(nextSense);
      currentSense = nextSense;
      currentSection = null;
      continue;
    }

    const runIn = canon.match(RUN_IN_SECTION_RE);
    if (runIn) {
      if (!currentSense) {
        currentSense = createSense("1");
        senseBuilders.push(currentSense);
      }
      currentSection = runIn[1] as SenseSectionKind;
      currentSense.sections[currentSection].push(runIn[2]);
      continue;
    }

    const section = canon.match(SECTION_RE);
    if (section) {
      if (!currentSense) {
        currentSense = createSense("1");
        senseBuilders.push(currentSense);
      }
      currentSection = section[1] as SenseSectionKind;
      continue;
    }

    if (!currentSense) {
      grammaticalFeatures.push(canon);
      continue;
    }

    if (currentSection) {
      currentSense.sections[currentSection].push(canon);
    }
  }

  const senses: InspectedEntry["senses"] = senseBuilders.map((sense) => {
    const definition = sense.sections.DEF.join(" ").trim();
    return {
      number: sense.number,
      definitionShort: truncate(definition || "Définition non renseignée", 120),
      definition: definition || "Définition non renseignée",
      sem: [...sense.sections.SEM],
      examples: sense.sections.EX.flatMap((line) => {
        const parsed = parseExampleTips(line);
        return parsed.length > 0 ? parsed : [{ text: line, url: null }];
      }),
      regimes: sense.sections.TR.map(parseRegimeLine),
      lexicalFunctions: sense.sections.FL.map(parseLexicalFunctionLine)
    };
  });

  return { grammaticalFeatures, senses };
}

export function inspectEntry(ast: EntryAst, diagnostics: DiagnosticLike[]): InspectedEntry {
  const sections: Record<string, string[]> = {};
  const { grammaticalFeatures, senses } = buildSenses(ast);

  for (const section of ast.sections) {
    sections[section.kind] = [...(sections[section.kind] ?? []), ...section.lines];
  }

  return {
    lemma: ast.header?.lemma ?? null,
    xsampa: ast.header?.xsampa ?? null,
    ipa: ast.header?.ipa ?? null,
    grammaticalFeatures,
    senses,
    sections,
    fls: ast.sections.flatMap((section, index) =>
      (section.flCalls ?? []).map((fl) => ({
        name: fl.name,
        value: fl.value,
        sectionIndex: index
      }))
    ),
    annotations: [],
    errors: diagnostics.filter((item) => item.severity === "error").length,
    warnings: diagnostics.filter((item) => item.severity === "warning").length
  };
}
