import { DiagnosticLike, EntryAst } from "../types";
import { validateAnnotationMarkers } from "./rules/annotationMarkers";
import { validateFlArity } from "./rules/flArity";
import { validateHeaderSyntax } from "./rules/headerSyntax";
import { validateKnownSections } from "./rules/knownSections";
import { validateRequiredSections } from "./rules/requiredSections";
import { validateSectionOrder } from "./rules/sectionOrder";
import { validateUniqueSections } from "./rules/uniqueSections";

export function validateDocument(ast: EntryAst): DiagnosticLike[] {
  return [
    ...validateHeaderSyntax(ast),
    ...validateKnownSections(ast),
    ...validateRequiredSections(ast),
    ...validateUniqueSections(ast),
    ...validateSectionOrder(ast),
    ...validateFlArity(ast),
    ...validateAnnotationMarkers(ast)
  ];
}
