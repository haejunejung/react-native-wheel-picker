/** @type {import("prettier").Config} */
module.exports = {
  printWidth: 100,
  tabWidth: 2,
  singleQuote: false,
  bracketSameLine: true,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: [
    "^react(-native)?$",
    "^@?expo",
    "^@?react-native(-.*)?$",
    "<THIRD_PARTY_MODULES>",
    "^@/",
    "^[./]",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderGroupNamespaceSpecifiers: true,
  importOrderCaseInsensitive: true,
};
