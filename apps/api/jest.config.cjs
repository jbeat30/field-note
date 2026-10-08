const base = require('@field-note/config/jest');

// ESM 전용 패키지(pg-boss 계열, file-type 계열)는 swc로 CommonJS 변환해서 사용 (기술 기획서 §13.1)
const ESM_ONLY_PACKAGES = [
  'pg-boss',
  'cron-parser',
  'rrule-temporal',
  'serialize-error',
  'non-error',
  'arctic',
  '@oslojs',
  'file-type',
  'strtok3',
  'token-types',
  'uint8array-extras',
  '@tokenizer',
  '@borewit',
];

module.exports = {
  ...base,
  displayName: 'api',
  testEnvironment: 'node',
  // 모든 DB 테스트가 공유하는 PostgreSQL 컨테이너 (src/db/sharedTestDatabase.ts)
  globalSetup: '<rootDir>/jest.global-setup.ts',
  globalTeardown: '<rootDir>/jest.global-teardown.ts',
  // .mjs로 배포되는 ESM 패키지도 변환 대상에 포함
  transform: { '^.+\\.(t|j|mj)sx?$': base.transform['^.+\\.(t|j)sx?$'] },
  transformIgnorePatterns: [
    `/node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(?:${ESM_ONLY_PACKAGES.join('|')})/)`,
  ],
};
