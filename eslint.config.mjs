import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginPrettier from "eslint-plugin-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    plugins: {
      "unused-imports": pluginUnusedImports,
      "prettier": pluginPrettier,
    },
    rules: {
      "unused-imports/no-unused-imports": "warn",
    },
  },
];

export default eslintConfig;
