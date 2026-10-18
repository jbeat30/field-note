module.exports = {
  projects: ['<rootDir>/packages/*/jest.config.cjs', '<rootDir>/apps/*/jest.config.cjs'],
  // 시험 파일이 쌓이면서 작업 프로세스의 메모리가 계속 늘어 느린 실행 환경(CI)에서 한계에 닿는 일을 막기 위해, 메모리가 넘은 작업 프로세스는 파일 하나를 마친 뒤 새로 시작
  workerIdleMemoryLimit: '1GB',
};
