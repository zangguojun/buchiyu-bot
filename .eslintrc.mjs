module.exports = {
  parser: "@babel/eslint-parser",
  env: {
    es2021: true,
    node: true,
  },
  extends: "standard-with-typescript",
  plugins: ["promise", "n", "import"],
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {},
};
