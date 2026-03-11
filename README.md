# DICO VS Code Extension

Extension VS Code pour fiches lexicographiques `.dico`.

## Fonctionnalités

- coloration syntaxique (sections, actants, fonctions lexicales, exemples, sources, annotations)
- configuration d’édition DICO (`%` en commentaire de ligne, paires auto-fermantes, etc.)
- diagnostics de structure (en-tête, sections connues, sections dupliquées par lexie)
- inspection interne
- panneau `Entry Inspector`
- commandes:
  - `DICO: Inspect Current File`
  - `DICO: Validate Workspace`

## Développement

```bash
npm install
npm run build
```

Ensuite:

1. Ouvrir le dossier dans VS Code.
2. Lancer `F5` (profil `Run Extension`).
3. Pour itérer rapidement, lancer `npm run watch` dans un terminal.

Quand les changements ne se reflètent pas:

1. arrêter le debug (`Shift+F5`)
2. relancer `F5`
3. dans la fenêtre Extension Development Host: `Developer: Reload Window`

## Packaging (repo source-only)

Ce dépôt peut rester sans `dist/` versionné.

Le build est exécuté automatiquement pendant le packaging:

- `npm run prepack` (via `npm pack`)
- `npm run vscode:prepublish` (via `vsce package` / `vsce publish`)

Les fichiers publiables sont limités par `package.json > files`.

## État actuel

- pas de LSP (complétion/hover/navigation non implémentés)
- validation sémantique avancée partielle
- pas d’index global du lexique

## Suivi des tâches

Voir [TODO.md](./TODO.md).
