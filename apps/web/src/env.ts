// Vite 환경 변수 접근은 이 파일로만 (Jest가 import.meta.env를 해석하지 못해 테스트에서 이 모듈을 mock)
export const env = {
  isDev: import.meta.env.DEV,
  // `vite --mode mock`: 백엔드 없이 브라우저 가짜 서버(msw)로 화면 확인
  isMockApi: import.meta.env.MODE === 'mock',
};
