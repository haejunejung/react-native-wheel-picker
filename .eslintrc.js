module.exports = {
  root: true,
  ignorePatterns: ["node_modules", "lib", "dist", "example"],
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
      plugins: ["@typescript-eslint", "react", "react-hooks", "prettier", "import"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:import/recommended",
        "plugin:prettier/recommended",
      ],
      rules: {
        "react/react-in-jsx-scope": "off",
        "react/display-name": "warn",
        "react/prop-types": "off",
        "import/no-cycle": "error",
        "import/no-unresolved": "off",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
            fixStyle: "separate-type-imports",
            disallowTypeAnnotations: false,
          },
        ],
        "@typescript-eslint/no-require-imports": "off",
        // A published library must not pull anything beyond its peer dependencies.
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["expo", "expo-*", "nativewind", "@expo/*"],
                message:
                  "The library must stay dependency-free — only react, react-native and react-native-reanimated are allowed.",
              },
            ],
          },
        ],
      },
      settings: {
        // `react` is not installed at the library root — it is only a peer dependency.
        react: {
          version: "19.0",
        },
        // react-native's entry file is written in Flow (`import typeof ...`), which the
        // ESLint parser cannot read — import/namespace must skip analyzing it.
        "import/ignore": ["react-native"],
        "import/resolver": {
          typescript: {
            project: `${__dirname}/tsconfig.json`,
          },
        },
      },
    },
  ],
};
