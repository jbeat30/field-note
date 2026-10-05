// Vite 환경 변수 접근은 이 파일로만 (Jest가 import.meta.env를 해석하지 못해 테스트에서 이 모듈을 mock)
export const env = {
  isDev: import.meta.env.DEV,
};
