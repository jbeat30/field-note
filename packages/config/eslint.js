import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
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
        '**/storybook-static/**',
        '**/.storybook/public/**',
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
    ...storybook.configs['flat/recommended'],
    {
      // 업무 코드는 DB 클라이언트를 직접 만들지 않고 withCompany가 넘겨주는 tx만 사용
      // (회사 범위 밖 전용 모듈과 기동 파일만 예외)
      files: ['apps/api/src/**/*.ts'],
      ignores: [
        'apps/api/src/db/**',
        'apps/api/src/session/**',
        'apps/api/src/main.ts',
        'apps/api/src/**/*.test.ts',
        'apps/api/src/**/*.contract.ts',
      ],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/db/client'],
                allowTypeImports: true,
                message: '업무 코드는 PrismaClient를 직접 만들지 않고 withCompany의 tx를 사용',
              },
            ],
          },
        ],
      },
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
