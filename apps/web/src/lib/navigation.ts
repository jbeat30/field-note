import { isHttpUrl } from './safeReturnPath';

/**
 * @description 다른 사이트(소셜 로그인 화면 등)로 이동, 테스트에서 이동을 막고 호출만 확인할 수 있도록 한 곳으로 모음
 * @param url 이동할 주소
 */
export const navigateAway = (url: string) => {
  // 서버가 준 주소라도 http(s)가 아니면 이동하지 않음 (javascript: 같은 형식 방어)
  if (!isHttpUrl(url)) {
    return;
  }

  window.location.assign(url);
};
