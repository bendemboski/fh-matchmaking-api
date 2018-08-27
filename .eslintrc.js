module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017
  },
  env: {
    'node': true,
    'es6': true
  },
  extends: [
    'eslint:recommended'
  ],
  rules: {
    'array-bracket-spacing': [ 'error', 'always' ],
    'arrow-parens': 'error',
    'arrow-spacing': 'error',
    'block-spacing': 'error',
    'brace-style': 'error',
    'camelcase': 'error',
    'comma-dangle': [ 'error', { 'functions': 'never' } ],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'curly': 'error',
    'dot-notation': 'error',
    'eqeqeq': 'error',
    'func-call-spacing': 'error',
    'indent': [ 'error', 2 ],
    'keyword-spacing': [ 'error', { 'before': true, 'after': true } ],
    'new-parens': 'error',
    'no-console': [ 'error', { allow: [ 'error' ] } ],
    'no-duplicate-imports': 'error',
    'no-global-assign': 'error',
    'no-loop-func': 'error',
    'no-multiple-empty-lines': 'error',
    'no-nested-ternary': 'error',
    'no-restricted-globals': [ 'error', 'event' ],
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-tabs': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-unneeded-ternary': 'error',
    'no-unused-vars': [ 'error', { vars: 'all', args: 'none' } ],
    'no-use-before-define': [ 'error', { 'functions': false, 'classes': false } ],
    'no-var': 'error',
    'no-whitespace-before-property': 'error',
    'object-curly-spacing': [ 'error', 'always' ],
    'object-shorthand': 'error',
    'one-var': [ 'error', 'never' ],
    'operator-linebreak': [ 'error', 'after' ],
    'prefer-spread': 'error',
    'prefer-template': 'error',
    'quotes': 'off',
    'radix': 'error',
    'rest-spread-spacing': 'error',
    'semi': [ 'error', 'always' ],
    'space-before-function-paren': [ 'error', {
      'anonymous': 'never',
      'named': 'never',
      'asyncArrow': 'always'
    } ],
    'space-before-blocks': 'error',
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'template-curly-spacing': 'error'
  },
  overrides: [
    {
      files: [
        'tests/**/*.js'
      ],
      env: {
        mocha: true
      }
    }
  ]
};
