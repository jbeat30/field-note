const base = require('@field-note/config/jest');

// ESM 전용 패키지(msw 계열)는 swc로 CommonJS 변환해서 사용 (기술 기획서 §13.1)
const ESM_ONLY_PACKAGES = [
  'msw',
  '@mswjs',
  '@open-draft',
  'until-async',
  'outvariant',
  'strict-event-emitter',
  'headers-polyfill',
  'rettime',
  'is-node-process',
  '@msw',
  'cookie',
  'openapi-fetch',
  'openapi-typescript-helpers',
];

// 로직 검증 전용 (화면 모양·동작은 Storybook, 전체 흐름은 Playwright)
module.exports = {
  ...base,
  displayName: 'web',
  testEnvironment: 'node',
  // .mjs로 배포되는 ESM 패키지도 변환 대상에 포함
  transform: { '^.+\\.(t|j|mj)sx?$': base.transform['^.+\\.(t|j)sx?$'] },
  transformIgnorePatterns: [
    `/node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(?:${ESM_ONLY_PACKAGES.join('|')})/)`,
  ],
};
