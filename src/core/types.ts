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
  sections: Record<string, string[]>;
  fls: Array<{
    name: string;
    value: string;
    sectionIndex: number;
  }>;
  annotations: AnnotationNode[];
  errors: number;
  warnings: number;
}

export interface AnalysisResult {
  ast: EntryAst;
  diagnostics: DiagnosticLike[];
  inspected: InspectedEntry | null;
}
