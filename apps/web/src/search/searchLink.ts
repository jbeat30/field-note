import type { SearchHit } from '@field-note/shared';

import { projectWorkPath } from '../lib/projectPaths';

/**
 * @description 검색 결과를 눌렀을 때 이동할 화면 주소, 프로젝트 없는 메모(메모함)는 메모함, 문서는 문서함 상세, 작업 내역은 그 날짜의 작업 화면
 * @param hit 검색 결과 한 건
 * @returns 화면 주소
 */
export const searchHitLink = (hit: SearchHit): string => {
  switch (hit.type) {
    case 'PROJECT':
      return `/projects/${hit.id}`;
    case 'EMPLOYEE':
      return `/employees/${hit.id}`;
    case 'MEMO':
      return hit.projectId ? `/projects/${hit.projectId}/memos` : '/inbox';
    case 'DOCUMENT':
      return `/projects/${hit.projectId}/documents?doc=${hit.id}`;
    case 'WORK_LOG':
      return projectWorkPath(hit.projectId ?? '', hit.date ?? undefined);
  }
};
