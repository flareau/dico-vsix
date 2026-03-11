import { DiagnosticLike, EntryAst } from "../types";
import { validateAnnotationMarkers } from "./rules/annotationMarkers";
import { validateHeaderSyntax } from "./rules/headerSyntax";
import { validateKnownSections } from "./rules/knownSections";
import { validateUniqueSections } from "./rules/uniqueSections";

export function validateDocument(ast: EntryAst): DiagnosticLike[] {
  return [
    ...validateHeaderSyntax(ast),
    ...validateKnownSections(ast),
    ...validateUniqueSections(ast),
    ...validateAnnotationMarkers(ast)
  ];
}
