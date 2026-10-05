const base = require('@field-note/config/jest');

// 로직 검증 전용 (화면 모양·동작은 Storybook, 전체 흐름은 Playwright)
module.exports = { ...base, displayName: 'web', testEnvironment: 'node' };
