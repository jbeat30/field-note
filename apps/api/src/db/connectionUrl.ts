/**
 * @description 접속 주소의 데이터베이스 이름만 바꾼 주소
 * @param uri 원래 접속 주소
 * @param database 바꿀 데이터베이스 이름
 * @returns 새 접속 주소
 */
export const withDatabase = (uri: string, database: string) => {
  const url = new URL(uri);

  url.pathname = `/${database}`;

  return url.toString();
};
