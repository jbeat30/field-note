const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * @description 메일 본문(HTML)에 넣을 값의 특수문자를 치환 (받는 사람이 준 값이 태그·속성으로 해석되지 않게 함)
 * @param value 본문에 넣을 값
 * @returns 치환한 문자열
 */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ENTITIES[char]!);
