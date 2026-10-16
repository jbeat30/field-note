import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// 한글이 들어 있는 문자열·템플릿 (사용자 문구 후보)
const KOREAN_TEXT =
  ':matches(Literal[value=/[가-힣]/], TemplateLiteral:has(TemplateElement[value.raw=/[가-힣]/]))';
const ZOD_METHODS =
  '/^(min|max|length|regex|email|url|refine|superRefine|int|positive|nonnegative|nonempty|startsWith|endsWith|uuid|datetime|gt|gte|lt|lte)$/';
const FORM_ERROR_SETTERS = '/^(setError|setErrors|setFormError)$/';
const INLINE_ERROR_MESSAGE_NOTICE =
  '사용자에게 보이는 오류 문구는 packages/shared/src/errorMessages.ts의 상수로 관리 (인라인 문자열 금지)';
// 인라인 오류 문구가 들어가는 자리: message 속성, 검증 메서드 인자, 폼 오류 설정, 도메인 오류 생성자
const INLINE_ERROR_MESSAGE_SELECTORS = [
  `Property[key.name='message'] > ${KOREAN_TEXT}`,
  `Property[key.name='message'] > ConditionalExpression > ${KOREAN_TEXT}`,
  `Property[key.name='message'] > ConditionalExpression > ConditionalExpression > ${KOREAN_TEXT}`,
  `CallExpression[callee.property.name=${ZOD_METHODS}] > ${KOREAN_TEXT}`,
  `CallExpression[callee.name=${FORM_ERROR_SETTERS}] > ${KOREAN_TEXT}`,
  `CallExpression[callee.name=${FORM_ERROR_SETTERS}] > ConditionalExpression > ${KOREAN_TEXT}`,
  `CallExpression[callee.name=${FORM_ERROR_SETTERS}] > ObjectExpression > Property > ${KOREAN_TEXT}`,
  `NewExpression[callee.name=/.Error$/][callee.name!=/^(Range|Type|Syntax|Reference|Eval|URI)Error$/] > ${KOREAN_TEXT}`,
];

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
      // 사용자에게 보이는 오류 문구는 packages/shared/src/errorMessages.ts의 상수만 사용 (인라인 한글 문구 금지)
      files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
      ignores: [
        '**/*.test.{ts,tsx}',
        '**/*.stories.tsx',
        '**/e2e/**',
        '**/scripts/**',
        '**/generated/**',
        'packages/shared/src/errorMessages.ts',
      ],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...INLINE_ERROR_MESSAGE_SELECTORS.map((selector) => ({
            selector,
            message: INLINE_ERROR_MESSAGE_NOTICE,
          })),
        ],
      },
    },
    {
      files: ['**/*.test.{ts,tsx}'],
      languageOptions: { globals: globals.jest },
    },
    {
      files: ['**/*.{js,cjs,mjs}'],
      languageOptions: { globals: globals.node },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
  );
