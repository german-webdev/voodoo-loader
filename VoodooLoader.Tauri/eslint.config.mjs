import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import jestDom from "eslint-plugin-jest-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "storybook-static/**",
      "node_modules/**",
      "src-tauri/target/**",
      "playwright-report/**",
      "test-results/**",
      "**/*.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: [
      "src/**/*.{ts,tsx}",
      ".storybook/*.ts",
      "playwright.config.ts",
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...testingLibrary.configs.react.rules,
      ...jestDom.configs["flat/recommended"].rules,
      "@typescript-eslint/consistent-type-definitions": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", disallowTypeAnnotations: false },
      ],
    },
  },
  eslintConfigPrettier,
);
