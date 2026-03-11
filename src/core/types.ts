export type Severity = "error" | "warning" | "info";

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface DiagnosticLike {
  code: string;
  message: string;
  severity: Severity;
  range: Range;
}

export type SectionKind = "DEF" | "SEM" | "TR" | "FL" | "EX" | "REM" | "UNKNOWN";

export interface HeaderNode {
  raw: string;
  lemma: string | null;
  xsampa: string | null;
  ipa: string | null;
  range: Range;
}

export interface AnnotationNode {
  marker: "*" | "!";
  text: string;
  range: Range;
}

export interface InspectedAnnotation {
  marker: "*" | "!";
  penalty: number;
  target: "item" | "example";
  text: string;
}

export interface FlCallNode {
  name: string;
  value: string;
  raw: string;
  range: Range;
}

export interface SectionNode {
  kind: SectionKind;
  titleRaw: string;
  lines: string[];
  range: Range;
  flCalls?: FlCallNode[];
}

export interface EntryAst {
  header: HeaderNode | null;
  sections: SectionNode[];
  annotations: AnnotationNode[];
  rawLines: string[];
}

export interface InspectedEntry {
  lemma: string | null;
  xsampa: string | null;
  ipa: string | null;
  grammaticalFeatures: string[];
  senses: Array<{
    number: string;
    rem: string[];
    definition: {
      status: "valid" | "missing" | "invalid";
      raw: string;
      definiendum: string;
      definiens: string;
      annotations: InspectedAnnotation[];
    } | null;
    sem: {
      status: "valid" | "missing" | "invalid";
      raw: string;
      definiendum: string;
      definiens: string;
      conditions: string | null;
      annotations: InspectedAnnotation[];
    } | null;
    examples: Array<{
      status: "valid" | "missing" | "invalid";
      text: string;
      url: string | null;
      web: boolean;
      annotations: InspectedAnnotation[];
    }>;
    regimes: Array<{
      status: "valid" | "missing" | "invalid";
      pattern: string;
      examples: Array<{
        status: "valid" | "missing" | "invalid";
        text: string;
        url: string | null;
        web: boolean;
        annotations: InspectedAnnotation[];
      }>;
      annotations: InspectedAnnotation[];
    }>;
    lexicalFunctions: Array<{
      status: "valid" | "missing" | "invalid";
      name: string;
      value: string;
      regimePre: string | null;
      regimePost: string | null;
      examples: Array<{
        status: "valid" | "missing" | "invalid";
        text: string;
        url: string | null;
        web: boolean;
        annotations: InspectedAnnotation[];
      }>;
      annotations: InspectedAnnotation[];
    }>;
    definitionShort: string;
  }>;
  sections: Record<string, string[]>;
  fls: Array<{
    name: string;
    value: string;
    sectionIndex: number;
  }>;
  annotations: InspectedAnnotation[];
  errors: number;
  warnings: number;
}

export interface AnalysisResult {
  ast: EntryAst;
  diagnostics: DiagnosticLike[];
  inspected: InspectedEntry | null;
}
