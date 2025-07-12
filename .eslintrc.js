module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'max-len': ['error', { code: 120 }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/prefer-default-export': 'off',
    'no-param-reassign': ['error', { props: false }],
    'consistent-return': 'off',
    'no-underscore-dangle': 'off'
  },
  globals: {
    io: 'readonly',
    socket: 'readonly'
  }
};