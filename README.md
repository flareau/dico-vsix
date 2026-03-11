# DICO extension skeleton

Squelette d’extension VS Code pour fiches lexicographiques `.dico`.

## Ce bundle fournit déjà

- coloration syntaxique de base
- parseur structuré minimal
- diagnostics VS Code
- validation de quelques règles
- compilation en représentation interne
- panneau `Entry Inspector`
- commande `DICO: Compile Current File`
- commande `DICO: Validate Workspace`

## Installation

```bash
npm install
npm run build
```

Puis ouvrir le dossier dans VS Code et lancer l’extension en mode développement (`F5`).

## Limites actuelles

- parseur volontairement minimal
- pas de LSP
- pas de complétion/hover/navigation
- validation logique encore rudimentaire
- pas d’index global du lexique

## Étapes suivantes recommandées

1. stabiliser la vraie grammaire des fiches
2. enrichir le parseur section par section
3. compléter la table des fonctions lexicales
4. ajouter un index du workspace
5. basculer ensuite vers un language server si nécessaire
