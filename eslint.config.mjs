import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Hydration-safe stores, timers and portals intentionally initialise
      // client-only state inside effects. The rule is too strict for this
      // pattern; effects here do not cause unbounded render cascades.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "deliverables/.build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
