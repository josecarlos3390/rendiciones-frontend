// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Selector conventions — warn for existing code, enforce on new
      '@angular-eslint/directive-selector': [
        'warn',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // Do NOT force massive migration to built-in control flow or inject()
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-standalone': 'off',

      // any is acceptable in this codebase for dynamic SAP/HANA data
      '@typescript-eslint/no-explicit-any': 'warn',

      // Keep useful bug-catching rules as errors
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-constant-binary-expression': 'error',

      // Style rules that would require large refactors — warn
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/no-output-native': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/array-type': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended],
    rules: {
      // Do NOT force massive migration from *ngIf/*ngFor to @if/@for
      '@angular-eslint/template/prefer-control-flow': 'off',

      // eqeqeq in templates is common in legacy Angular — warn
      '@angular-eslint/template/eqeqeq': 'warn',

      // Accessibility rules that would require large refactors — warn
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/no-autofocus': 'warn',
      '@angular-eslint/template/label-has-associated-control': 'warn',
    },
  },
]);
