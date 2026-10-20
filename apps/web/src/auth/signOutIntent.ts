// 사용자가 직접 로그아웃하는 중인지 기억 (세션 만료와 구분해 복귀 경로·만료 안내를 붙이지 않기 위함)
let signingOut = false;

export const setSigningOut = (value: boolean) => {
  signingOut = value;
};

export const isSigningOut = () => signingOut;
