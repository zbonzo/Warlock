module.exports = {
  extends: [
    "eslint:recommended", // ESLint's recommended rules
    "plugin:react/recommended", // If you're using React (optional)
    "plugin:prettier/recommended" // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2021, // Or the version of ECMAScript you are using
    sourceType: "module",
    ecmaFeatures: {
      jsx: true // If you're using JSX
    }
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true // If you're using Jest for testing
  },
  rules: {
    // You can override or add ESLint rules here if needed
    // "prettier/prettier": "error" // This is usually enabled by "plugin:prettier/recommended"
  },
  settings: {
    react: {
      version: "detect" // If you're using React, this detects the React version
    }
  }
};