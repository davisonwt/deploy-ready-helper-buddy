import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "supabase/functions/**/deps.ts",
    ],
  },
    {
      extends: [
        js.configs.recommended,
        ...tseslint.configs.recommended,
        ...tseslint.configs.stylistic,
      ],
      files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
        parserOptions: {
          tsconfigRootDir: import.meta.dirname,
          ecmaVersion: "latest",
          sourceType: "module",
        },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
        ...reactHooks.configs.recommended.rules,
        "@typescript-eslint/consistent-type-imports": "warn",
          "@typescript-eslint/consistent-type-definitions": "off",
          "@typescript-eslint/array-type": "off",
          "@typescript-eslint/consistent-indexed-object-style": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/consistent-generic-constructors": "off",
        "@typescript-eslint/no-inferrable-types": "off",
          "@typescript-eslint/no-empty-function": "off",
          "@typescript-eslint/no-empty-object-type": "off",
          "@typescript-eslint/prefer-for-of": "off",
          "@typescript-eslint/no-require-imports": "off",
          "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^ignored" },
      ],
        "@typescript-eslint/no-unused-expressions": "off",
        "no-async-promise-executor": "off",
        "no-empty": "off",
        "no-useless-escape": "off",
        "no-case-declarations": "off",
        "prefer-const": "off",
        "no-console": ["warn", { allow: ["error", "warn"] }],
        "react-hooks/rules-of-hooks": "warn",
    },
  },
  // Slice 8 — TS ratchet.
  // Flag any *new* .js / .jsx file under src/ with a one-time warning so
  // contributors are nudged toward .ts / .tsx. Existing .jsx files are
  // grandfathered in (there are ~180 of them; opportunistic conversion only,
  // never big-bang). See CONTRIBUTING.md for the rule.
  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Program",
          message:
            "TS ratchet: new files must be .ts or .tsx. Convert this file to .tsx opportunistically when you next touch it (see CONTRIBUTING.md).",
        },
      ],
    },
  },
);

