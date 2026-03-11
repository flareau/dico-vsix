import { DiagnosticLike, EntryAst } from "../../types";

const LF_ARITY: Record<string, number> = {
  Magn: 1,
  Oper1: 1,
  Oper2: 1,
  Oper3: 1,
  Real1: 1,
  Real2: 1,
  Func0: 1,
  Func1: 1,
  Labor12: 1
};

export function validateFlArity(ast: EntryAst): DiagnosticLike[] {
  const diagnostics: DiagnosticLike[] = [];

  for (const section of ast.sections) {
    for (const fl of section.flCalls ?? []) {
      const expected = LF_ARITY[fl.name];
      if (expected === undefined) continue;
      if (fl.args.length !== expected) {
        diagnostics.push({
          code: "fl.arity",
          message: `${fl.name} attend ${expected} argument(s), trouvé ${fl.args.length}.`,
          severity: "warning",
          range: fl.range
        });
      }
    }
  }

  return diagnostics;
}
