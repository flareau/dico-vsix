import { DiagnosticLike, EntryAst, InspectedAnnotation, InspectedEntry } from "../types";
import { stripInlineComment } from "../parser/commentSyntax";

const SECTION_RE = /^\s*(DEF|SEM|TR|FL|EX|REM)\b/u;
const NUMBER_RE = /^\s*(\d+)\.\s*$/u;
const NUMBER_WITH_SECTION_RE = /^\s*(\d+)\.\s*(DEF|SEM|TR|FL|EX|REM)\s*$/u;
const RUN_IN_SECTION_RE = /^\s*(DEF|SEM|TR|FL|EX|REM)\s+(.+)$/u;
const ANNOTATION_RE = /^\s*([*!]+)(\.?)\s*(.+)$/u;

type SenseSectionKind = "DEF" | "SEM" | "TR" | "FL" | "EX" | "REM";
type ItemStatus = "valid" | "missing" | "invalid";

interface AnnotationCarrier {
  annotations: InspectedAnnotation[];
}

interface ExampleItem extends AnnotationCarrier {
  status: ItemStatus;
  text: string;
  url: string | null;
  web: boolean;
}

interface SenseBuilder {
  number: string;
  sections: Record<SenseSectionKind, string[]>;
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

function splitStatus(line: string): { status: ItemStatus; rest: string } {
  const match = line.match(/^([+-])\s*(.*)$/u);
  if (!match) return { status: "valid", rest: line.trim() };
  return {
    status: match[1] === "+" ? "missing" : "invalid",
    rest: (match[2] ?? "").trim()
  };
}

function parseAnnotationString(line: string): InspectedAnnotation | null {
  const m = line.match(ANNOTATION_RE);
  if (!m) return null;

  const marker: "!" | "*" = m[1].startsWith("!") ? "!" : "*";
  return {
    marker,
    penalty: marker === "!" ? m[1].length : 0,
    target: m[2] ? "example" : "item",
    text: (m[3] ?? "").trim()
  };
}

function attachAnnotation<T extends AnnotationCarrier>(
  annotation: InspectedAnnotation,
  lastItem: T | null,
  getLastExample: (item: T) => ExampleItem | undefined,
  sink: InspectedAnnotation[],
): void {
  if (!lastItem) return;

  if (annotation.target === "example") {
    const ex = getLastExample(lastItem);
    if (ex) {
      ex.annotations.push(annotation);
      sink.push(annotation);
      return;
    }
  }

  lastItem.annotations.push(annotation);
  sink.push(annotation);
}

function parseExampleString(line: string): ExampleItem | null {
  const m = line.match(/^([+-]\s*)?"((?:[^"\\]|\\.)+)"\s*(?:\(\s*(.+?)\s*\))?$/u);
  if (!m) return null;

  const prefix = m[1]?.trim();
  const status: ItemStatus = prefix === "+" ? "missing" : prefix === "-" ? "invalid" : "valid";
  const url = m[3]?.trim() ?? null;

  return {
    status,
    text: (m[2] ?? "").trim(),
    url,
    web: Boolean(url && /^https?:\/\//iu.test(url)),
    annotations: []
  };
}

function parseExamplifiedLine(line: string): { status: ItemStatus; item: string; inlineExample: ExampleItem | null } {
  const { status, rest } = splitStatus(line);
  const m = rest.match(/^(.+?)\s*("(?:[^"\\]|\\.)+"\s*(?:\(\s*.+?\s*\))?)?$/u);

  if (!m) {
    return { status, item: rest, inlineExample: null };
  }

  const item = (m[1] ?? "").trim();
  const inlineRaw = (m[2] ?? "").trim();
  if (!inlineRaw) {
    return { status, item, inlineExample: null };
  }

  const inline = parseExampleString(inlineRaw);
  return {
    status,
    item,
    inlineExample: inline ? { ...inline, status } : null
  };
}

function parseDefinition(lines: string[], sink: InspectedAnnotation[]): InspectedEntry["senses"][number]["definition"] {
  let definition: InspectedEntry["senses"][number]["definition"] = null;

  for (const line of lines) {
    const annotation = parseAnnotationString(line);
    if (annotation) {
      attachAnnotation(annotation, definition, () => undefined, sink);
      continue;
    }

    const { status, rest } = splitStatus(line);
    const m = rest.match(/^(.+?)\s*=\s*(.+)$/u);

    if (!definition) {
      definition = {
        status,
        raw: rest,
        definiendum: m ? (m[1] ?? "").trim() : rest,
        definiens: m ? (m[2] ?? "").trim() : "",
        annotations: []
      };
      continue;
    }

    definition.raw = `${definition.raw} ${rest}`.trim();
    definition.definiens = `${definition.definiens} ${rest}`.trim();
  }

  return definition;
}

function parseSem(lines: string[], sink: InspectedAnnotation[]): InspectedEntry["senses"][number]["sem"] {
  let sem: InspectedEntry["senses"][number]["sem"] = null;

  for (const line of lines) {
    const annotation = parseAnnotationString(line);
    if (annotation) {
      attachAnnotation(annotation, sem, () => undefined, sink);
      continue;
    }

    const { status, rest } = splitStatus(line);
    const [equation, cond] = rest.split(/\s*\|\s*/u, 2);
    const m = equation.match(/^(.+?)\s*=\s*(.+)$/u);

    if (!sem) {
      sem = {
        status,
        raw: rest,
        definiendum: m ? (m[1] ?? "").trim() : equation.trim(),
        definiens: m ? (m[2] ?? "").trim() : "",
        conditions: cond?.trim() ?? null,
        annotations: []
      };
      continue;
    }

    sem.raw = `${sem.raw} ${rest}`.trim();
    sem.definiens = `${sem.definiens} ${rest}`.trim();
  }

  return sem;
}

function parseEx(lines: string[], sink: InspectedAnnotation[]): ExampleItem[] {
  const items: ExampleItem[] = [];

  for (const line of lines) {
    const annotation = parseAnnotationString(line);
    if (annotation) {
      attachAnnotation(annotation, items.at(-1) ?? null, (item) => item, sink);
      continue;
    }

    const parsed = parseExampleString(line);
    if (parsed) {
      items.push(parsed);
      continue;
    }

    const { status, rest } = splitStatus(line);
    if (!rest) continue;
    items.push({ status, text: rest, url: null, web: false, annotations: [] });
  }

  return items;
}

function parseTr(lines: string[], sink: InspectedAnnotation[]): InspectedEntry["senses"][number]["regimes"] {
  const items: InspectedEntry["senses"][number]["regimes"] = [];

  for (const line of lines) {
    const annotation = parseAnnotationString(line);
    if (annotation) {
      attachAnnotation(annotation, items.at(-1) ?? null, (item) => item.examples.at(-1), sink);
      continue;
    }

    const ex = parseExampleString(line);
    if (ex && items.length > 0) {
      items[items.length - 1].examples.push(ex);
      continue;
    }

    const parsed = parseExamplifiedLine(line);
    if (!parsed.item) continue;

    const item = {
      status: parsed.status,
      pattern: parsed.item,
      examples: [] as ExampleItem[],
      annotations: [] as InspectedAnnotation[]
    };

    if (parsed.inlineExample) {
      item.examples.push(parsed.inlineExample);
    }

    items.push(item);
  }

  return items;
}

function parseFl(lines: string[], sink: InspectedAnnotation[]): InspectedEntry["senses"][number]["lexicalFunctions"] {
  const items: InspectedEntry["senses"][number]["lexicalFunctions"] = [];

  for (const line of lines) {
    const annotation = parseAnnotationString(line);
    if (annotation) {
      attachAnnotation(annotation, items.at(-1) ?? null, (item) => item.examples.at(-1), sink);
      continue;
    }

    const ex = parseExampleString(line);
    if (ex && items.length > 0) {
      items[items.length - 1].examples.push(ex);
      continue;
    }

    const parsed = parseExamplifiedLine(line);
    const core = parsed.item;
    if (!core) continue;

    const m = core.match(/^(.*?)\s*=\s*(\[[^[\]]+\])?\s*(@?\s*.+?)\s*(\[[^[\]]+\])?\s*$/u);

    let name = core;
    let value = "";
    let regimePre: string | null = null;
    let regimePost: string | null = null;

    if (m) {
      name = (m[1] ?? "").replace(/ *([+:/]) */gu, "$1").trim();
      regimePre = m[2] ? m[2].slice(1, -1).trim() : null;
      value = (m[3] ?? "").trim();
      regimePost = m[4] ? m[4].slice(1, -1).trim() : null;
    }

    const item = {
      status: parsed.status,
      name,
      value,
      regimePre,
      regimePost,
      examples: [] as ExampleItem[],
      annotations: [] as InspectedAnnotation[]
    };

    if (parsed.inlineExample) {
      item.examples.push(parsed.inlineExample);
    }

    items.push(item);
  }

  return items;
}

function buildSenses(ast: EntryAst): {
  grammaticalFeatures: string[];
  senses: InspectedEntry["senses"];
  annotations: InspectedAnnotation[];
} {
  const grammaticalFeatures: string[] = [];
  const senseBuilders: SenseBuilder[] = [];
  let currentSense: SenseBuilder | null = null;
  let currentSection: SenseSectionKind | null = null;

  for (let i = 0; i < ast.rawLines.length; i += 1) {
    const canon = normalizeLine(ast.rawLines[i]);
    if (!canon) continue;
    if (canon === ast.header?.raw) continue;

    const annotation = parseAnnotationString(canon);
    if (annotation) {
      if (currentSense && currentSection) {
        currentSense.sections[currentSection].push(canon);
      }
      continue;
    }

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

  const annotations: InspectedAnnotation[] = [];
  const senses: InspectedEntry["senses"] = senseBuilders.map((sense) => {
    const definition = parseDefinition(sense.sections.DEF, annotations);
    const sem = parseSem(sense.sections.SEM, annotations);
    const examples = parseEx(sense.sections.EX, annotations);
    const regimes = parseTr(sense.sections.TR, annotations);
    const lexicalFunctions = parseFl(sense.sections.FL, annotations);
    const definitionShort = truncate(definition?.definiens || definition?.raw || "Définition non renseignée", 120);

    return {
      number: sense.number,
      rem: [...sense.sections.REM],
      definition,
      sem,
      examples,
      regimes,
      lexicalFunctions,
      definitionShort
    };
  });

  return { grammaticalFeatures, senses, annotations };
}

export function inspectEntry(ast: EntryAst, diagnostics: DiagnosticLike[]): InspectedEntry {
  const sections: Record<string, string[]> = {};
  const { grammaticalFeatures, senses, annotations } = buildSenses(ast);

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
      })),
    ),
    annotations,
    errors: diagnostics.filter((item) => item.severity === "error").length,
    warnings: diagnostics.filter((item) => item.severity === "warning").length
  };
}
