// AUTOSETUP — eslint.config.js
//
// Aplica ADR-CORE-003 (Core Extension Patterns) via eslint-plugin-boundaries:
// Workers = Execution Extensions, Adapters = Integration Extensions.
// Ambos são transversais e reutilizáveis, e NUNCA devem importar um do
// outro nem importar diretamente de apps/core — só de packages/shared.
//
// Referência arquitetural: ADR-CORE-003, DGV-001 (mudança neste arquivo
// exige ADR, não é ajuste local).
//
// Nota real (corrigida após falha de CI real neste mesmo dia): a versão
// anterior deste arquivo não tinha "files"/parser configurados, então
// nenhum arquivo .ts batia com o glob e o lint falhava em todo pacote.
// Corrigido para valer de verdade, com typescript-eslint + globals.

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";
import globals from "globals";

export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/*.config.*"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: { ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "core", pattern: "apps/core/*" },
        { type: "shared", pattern: "packages/shared/*" },
        { type: "workers", pattern: "packages/workers/*" },
        { type: "adapters", pattern: "packages/adapters/*" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "core", allow: ["shared", "workers", "adapters"] },
            { from: "shared", allow: ["shared"] },
            { from: "workers", allow: ["shared"] },
            { from: "adapters", allow: ["shared"] },
          ],
        },
      ],
      "no-unused-vars": "off",
    },
  },
];
