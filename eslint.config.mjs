import { dirname } from "path";
import { fileURLToPath } from "url";
import nextConfig from "eslint-config-next";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginPrettier from "eslint-plugin-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextConfig,
  {
    settings: {
      react: {
        version: "19.0.0",
      },
    },
  },
  {
    ignores: ["public/serviceWorker.js", "app/mcp/mcp_config.json", "app/mcp/mcp_config.default.json", ".next/**", "node_modules/**"],
  },
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

