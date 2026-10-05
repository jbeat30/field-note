import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @description 저장소 공통 ESLint flat 설정
 * @returns 무시 경로, 기본 규칙, 앱별 환경 설정 배열
 */
export const createConfig = () =>
  tseslint.config(
    {
      ignores: [
        '**/dist/**',
        '**/coverage/**',
        '**/node_modules/**',
        'docs/**',
        '**/generated/**',
        'packages/shared/openapi/**',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
      languageOptions: { globals: globals.node },
    },
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      plugins: { 'react-hooks': reactHooks },
      languageOptions: { globals: globals.browser },
      rules: reactHooks.configs.recommended.rules,
    },
    {
      files: ['**/*.test.{ts,tsx}'],
      languageOptions: { globals: globals.jest },
    },
    {
      files: ['**/*.{js,cjs}'],
      languageOptions: { globals: globals.node },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
  );
