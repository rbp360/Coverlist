/* eslint-env node */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
  },
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  extends: ['next/core-web-vitals', 'plugin:import/recommended'],
  plugins: ['import'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
  },
};
