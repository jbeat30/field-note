/**
 * @description 프로젝트의 작업 내역(날짜별 일한 사람·시간·한 일) 화면 주소
 * @param projectId 프로젝트 id
 * @param date 날짜(YYYY-MM-DD). 없으면 그 프로젝트의 작업 내역 목록
 * @returns 화면 주소
 */
export const projectWorkPath = (projectId: string, date?: string) =>
  date ? `/projects/${projectId}/work/${date}` : `/projects/${projectId}`;
