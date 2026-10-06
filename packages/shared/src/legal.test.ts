import { LEGAL_DOCUMENT_META } from './account';
import { DEMO_LEGAL_DOCUMENTS } from './demo';
import { getLegalDocumentContent, LEGAL_DOCUMENT_CONTENTS, legalDocumentText } from './legal';

const contents = Object.values(LEGAL_DOCUMENT_CONTENTS);

describe('약관·처리방침 문서 원본', () => {
  it('세 종류 문서가 모두 있고 제목·경로가 화면 메타와 같다', () => {
    expect(contents.map((content) => content.type).sort()).toEqual([
      'MARKETING',
      'PRIVACY_POLICY',
      'TERMS_OF_SERVICE',
    ]);

    for (const content of contents) {
      expect(content.title).toBe(LEGAL_DOCUMENT_META[content.type].title);
      expect(content.path).toBe(LEGAL_DOCUMENT_META[content.type].path);
      expect(content.sections.length).toBeGreaterThan(0);
    }
  });

  it('필수 문서는 이용약관·처리방침, 마케팅만 선택이다', () => {
    expect(getLegalDocumentContent('TERMS_OF_SERVICE').isRequired).toBe(true);
    expect(getLegalDocumentContent('PRIVACY_POLICY').isRequired).toBe(true);
    expect(getLegalDocumentContent('MARKETING').isRequired).toBe(false);
  });

  it('버전은 날짜 형식이고 시행 시각이 유효하다', () => {
    for (const content of contents) {
      expect(content.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(content.effectiveAt))).toBe(false);
    }
  });

  it('초안인 문서는 확정 전 항목을 밝힌다 (처리방침은 책임자·위탁·국외 이전 포함)', () => {
    const pending = getLegalDocumentContent('PRIVACY_POLICY').pendingItems.join('\n');

    expect(pending).toContain('보호책임자');
    expect(pending).toContain('수탁·위탁');
    expect(pending).toContain('국외 이전');
  });

  it('본문 평문은 같은 입력이면 같고, 내용이 바뀌면 달라진다 (해시 입력)', () => {
    const privacy = getLegalDocumentContent('PRIVACY_POLICY');
    const edited = { ...privacy, sections: privacy.sections.slice(1) };

    expect(legalDocumentText(privacy)).toBe(legalDocumentText(privacy));
    expect(legalDocumentText(edited)).not.toBe(legalDocumentText(privacy));
  });

  it('초안 안내 항목은 동의 대상 본문(해시 입력)에 포함되지 않는다', () => {
    const privacy = getLegalDocumentContent('PRIVACY_POLICY');

    for (const item of privacy.pendingItems) {
      expect(legalDocumentText(privacy)).not.toContain(item);
    }
  });

  it('서비스 기획서의 핵심 정책을 담는다 (수집하지 않는 정보, 14일 유예, 만 14세, 쿠키)', () => {
    const text = legalDocumentText(getLegalDocumentContent('PRIVACY_POLICY'));

    expect(text).toContain('주민등록번호, 계좌번호');
    expect(text).toContain('14일의 유예');
    expect(text).toContain('만 14세 미만은 서비스에 가입할 수 없으며');
    expect(text).toContain('광고나 이용 행태 추적을 위한 쿠키는 사용하지 않습니다');
  });

  it('비밀번호와 1회용 값의 처리 방식을 실제 구현대로 설명한다', () => {
    const text = legalDocumentText(getLegalDocumentContent('PRIVACY_POLICY'));

    expect(text).toContain('복원할 수 없는');
    expect(text).toContain('원문을 저장하지 않습니다');
  });

  it('시드가 쓰는 데모 문서는 이 원본의 버전·본문을 그대로 쓴다', () => {
    for (const document of DEMO_LEGAL_DOCUMENTS) {
      const content = getLegalDocumentContent(document.type);

      expect(document.version).toBe(content.version);
      expect(document.draftText).toBe(legalDocumentText(content));
    }
  });
});
