// AUTOSETUP — eslint.config.js
//
// Aplica ADR-CORE-003 (Core Extension Patterns) via eslint-plugin-boundaries:
// Workers = Execution Extensions, Adapters = Integration Extensions.
// Ambos são transversais e reutilizáveis, e NUNCA devem importar um do
// outro nem importar diretamente de apps/core — só de packages/shared.
//
// Referência arquitetural: ADR-CORE-003, DGV-001 (mudança neste arquivo
// exige ADR, não é ajuste local).

import boundaries from "eslint-plugin-boundaries";

export default [
  {
    plugins: { boundaries },
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
    },
  },
];
