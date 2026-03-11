import { compileEntry } from "./compile/compileEntry";
import { parseDocument } from "./parser/parseDocument";
import { AnalysisResult } from "./types";
import { validateDocument } from "./validate/validateDocument";

export function analyzeDocument(text: string): AnalysisResult {
  const ast = parseDocument(text);
  const diagnostics = validateDocument(ast);

  return {
    ast,
    diagnostics,
    compiled: compileEntry(ast, diagnostics)
  };
}
