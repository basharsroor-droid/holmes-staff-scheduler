import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  // The TypeScript rules had silently gone missing: a legacy .eslintrc.json
  // extended "next/typescript", but ESLint 9 reads only this flat config and
  // ignores .eslintrc.json entirely. That is how 60 `any` casts reached main
  // with CI green. See docs/REMEDIATION_PLAN.md (A1/A2).
  ...nextTs,
  {
    // Existing client-only demo state is hydrated from local/session storage.
    // Keep the stricter React 19 rules enabled for new code while documenting
    // these two legacy patterns for a dedicated refactor.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      // Generated database types exist for every table now; an `any` on a
      // Supabase client disables checking for every query in the file.
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  globalIgnores([".next/**", "node_modules/**", "playwright-report/**", "test-results/**", ".claude/**"])
]);
