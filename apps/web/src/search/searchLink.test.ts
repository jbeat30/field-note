import type { SearchHit } from '@field-note/shared';

import { searchHitLink } from './searchLink';

const hit = (patch: Partial<SearchHit>): SearchHit => ({
  type: 'PROJECT',
  id: 'h1',
  title: '제목',
  snippet: null,
  projectId: null,
  projectName: null,
  date: null,
  badge: null,
  ...patch,
});

describe('검색 결과 이동 주소', () => {
  it('종류마다 해당 화면으로 이동한다', () => {
    expect(searchHitLink(hit({ type: 'PROJECT', id: 'p1' }))).toBe('/projects/p1');
    expect(searchHitLink(hit({ type: 'EMPLOYEE', id: 'e1' }))).toBe('/employees/e1');
    expect(searchHitLink(hit({ type: 'DOCUMENT', id: 'd1', projectId: 'p1' }))).toBe(
      '/projects/p1/documents?doc=d1',
    );
    expect(searchHitLink(hit({ type: 'WORK_LOG', projectId: 'p1', date: '2026-10-06' }))).toBe(
      '/work-logs?project=p1&date=2026-10-06',
    );
  });

  it('프로젝트에 붙은 메모는 그 프로젝트의 메모 노트로, 메모함의 메모는 메모함으로 간다', () => {
    expect(searchHitLink(hit({ type: 'MEMO', projectId: 'p1' }))).toBe('/projects/p1/memos');
    expect(searchHitLink(hit({ type: 'MEMO', projectId: null }))).toBe('/inbox');
  });
});
