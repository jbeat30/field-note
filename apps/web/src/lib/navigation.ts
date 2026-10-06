/**
 * @description 다른 사이트(카카오 로그인 화면 등)로 이동. 테스트에서 이동을 막고 호출만 확인할 수 있도록 한 곳으로 모음
 * @param url 이동할 주소
 */
export const navigateAway = (url: string) => {
  window.location.assign(url);
};
