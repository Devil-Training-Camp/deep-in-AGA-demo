// ESLint flat config (ESLint 9 + typescript-eslint 8)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "output/**", "dist/**", ".agents/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // 占位阶段允许未实现的形参/变量，用下划线前缀显式标注
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // pipeline 占位阶段允许空函数体（如未实现的 stage）
      "@typescript-eslint/no-empty-function": "off",
    },
  },
);
