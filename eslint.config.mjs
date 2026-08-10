import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // Existing client-only demo state is hydrated from local/session storage.
    // Keep the stricter React 19 rules enabled for new code while documenting
    // these two legacy patterns for a dedicated refactor.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off"
    }
  },
  globalIgnores([".next/**", "node_modules/**", "playwright-report/**", "test-results/**"])
]);
