import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";
export default ts.config(
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "backend/dist/**",
      "backend/node_modules/**",
      ".local/**",
      ".react-router/**",
      ".taste-skill/**",
      "public/mockServiceWorker.js",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
