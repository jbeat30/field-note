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

  it('보호책임자·운영자 정보와 수탁·국외 이전 현황, 처리 기한을 기재한다', () => {
    const privacy = legalDocumentText(getLegalDocumentContent('PRIVACY_POLICY'));
    const terms = legalDocumentText(getLegalDocumentContent('TERMS_OF_SERVICE'));

    expect(privacy).toContain('성명은 강주빛이고 이메일은 jbeatfield@gmail.com');
    expect(terms).toContain('서비스 운영자는 강주빛입니다');

    for (const vendor of ['Amazon Web Services', 'Cloudflare', 'Google LLC']) {
      expect(privacy).toContain(vendor);
    }

    expect(privacy).toContain('국외일 수 있음');
    expect(privacy).toContain('10일 안에 처리 결과를 알립니다');
  });

  it('해지 후 유예가 끝나면 복구하지 않고 백업은 30일 안에 지워진다고 밝힌다', () => {
    const privacy = legalDocumentText(getLegalDocumentContent('PRIVACY_POLICY'));
    const terms = legalDocumentText(getLegalDocumentContent('TERMS_OF_SERVICE'));

    expect(terms).toContain('운영자도 복구할 수 없고 되살려 드리지 않습니다');
    expect(terms).toContain('최대 30일 남을 수 있으며');
    expect(privacy).toContain('유예가 끝난 뒤에는 운영자도 복구할 수 없습니다');
  });

  it('본문 평문은 같은 입력이면 같고, 내용이 바뀌면 달라진다 (해시 입력)', () => {
    const privacy = getLegalDocumentContent('PRIVACY_POLICY');
    const edited = { ...privacy, sections: privacy.sections.slice(1) };

    expect(legalDocumentText(privacy)).toBe(legalDocumentText(privacy));
    expect(legalDocumentText(edited)).not.toBe(legalDocumentText(privacy));
  });

  it('운영자는 평소 열람하지 않고 지원이 필요하면 이용자의 요청이나 승인을 받아 확인한다고 밝힌다', () => {
    for (const type of ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'] as const) {
      const text = legalDocumentText(getLegalDocumentContent(type));

      expect(text).toContain('열람하지 않');
      expect(text).toContain('이용자의 요청이나 승인을 받아 확인');
      expect(text).not.toContain('기록을 거칩니다');
      expect(text).not.toContain('작업은 기록으로 남깁니다');
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

  it('0.9.0에서 늘어난 수집·처리 항목을 처리방침과 이용약관에 담는다', () => {
    const privacy = legalDocumentText(getLegalDocumentContent('PRIVACY_POLICY'));
    const terms = legalDocumentText(getLegalDocumentContent('TERMS_OF_SERVICE'));

    expect(privacy).toContain('직원별 단가(일급·시급·월급·연봉)');
    expect(privacy).toContain('직원 서류(자격증 사본 등)와 프로젝트 문서(계약서·보증서 등)');
    expect(privacy).toContain('카카오·네이버·구글');
    expect(privacy).toContain('전체 데이터 내려받기');
    expect(terms).toContain('소셜 로그인(카카오·네이버·구글)');
    expect(terms).toContain('저장 용량 한도');
    expect(terms).toContain('전체 데이터를 엑셀 파일로 내려받을');
  });

  it('이용약관과 처리방침은 함께 바뀐 새 버전이다', () => {
    expect(getLegalDocumentContent('TERMS_OF_SERVICE').version).toBe('2026-10-21');
    expect(getLegalDocumentContent('PRIVACY_POLICY').version).toBe('2026-10-21');
  });

  it('2단계 인증(선택 기능)의 수집 항목·권리·보호 조치를 처리방침에 담는다', () => {
    const privacy = legalDocumentText(getLegalDocumentContent('PRIVACY_POLICY'));

    expect(privacy).toContain('2단계 인증을 켠 경우');
    expect(privacy).toContain('인증 앱 등록 키(암호화해 저장)');
    expect(privacy).toContain('2단계 인증 켜기·끄기');
    expect(privacy).toContain('복구 코드는 원문을 저장하지 않으며');
  });

  it('"내역"에 붙는 조사는 받침에 맞게 "은"을 쓴다 (잘못된 조사 재발 방지)', () => {
    for (const type of ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'] as const) {
      expect(legalDocumentText(getLegalDocumentContent(type))).not.toContain('작업 내역는');
    }
  });

  it('시드가 쓰는 데모 문서는 이 원본의 버전·본문을 그대로 쓴다', () => {
    for (const document of DEMO_LEGAL_DOCUMENTS) {
      const content = getLegalDocumentContent(document.type);

      expect(document.version).toBe(content.version);
      expect(document.draftText).toBe(legalDocumentText(content));
    }
  });
});
