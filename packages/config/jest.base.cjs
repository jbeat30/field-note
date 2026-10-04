// 패키지별 Jest 설정이 공유하는 swc 변환 기준 (CommonJS 변환, 타입 검사는 tsc 담당)
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: { parser: { syntax: 'typescript', tsx: true }, target: 'es2022' },
        module: { type: 'commonjs' },
      },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
