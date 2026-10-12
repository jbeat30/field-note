import {
  credentialCreateSchema,
  credentialDaysLeft,
  credentialStatus,
  credentialUpdateSchema,
  findCredentialGaps,
  sortCredentials,
} from './credentials';
import { employeeFileUploadRequestSchema, fileUploadRequestSchema } from './files';

const TYPE_A = '0198d000-0000-7000-8000-0000000000a1';
const TYPE_B = '0198d000-0000-7000-8000-0000000000a2';

describe('credentialStatus', () => {
  it('만료일이 없으면 유효이고 남은 일수도 없다', () => {
    expect(credentialStatus(null, '2026-10-13')).toBe('VALID');
    expect(credentialDaysLeft(null, '2026-10-13')).toBeNull();
  });

  it('만료일이 지났으면 만료, 오늘이 만료일이면 만료 임박', () => {
    expect(credentialStatus('2026-10-12', '2026-10-13')).toBe('EXPIRED');
    expect(credentialStatus('2026-10-13', '2026-10-13')).toBe('EXPIRING');
    expect(credentialDaysLeft('2026-10-12', '2026-10-13')).toBe(-1);
  });

  it('30일 이내는 만료 임박, 31일부터는 유효', () => {
    expect(credentialStatus('2026-11-12', '2026-10-13')).toBe('EXPIRING');
    expect(credentialStatus('2026-11-13', '2026-10-13')).toBe('VALID');
  });
});

describe('findCredentialGaps', () => {
  const period = { from: '2026-10-20', to: '2026-10-30' };

  it('필요 자격이 없으면 부족한 점도 없다', () => {
    expect(findCredentialGaps([], [], period)).toEqual([]);
  });

  it('서류가 없으면 자격 없음', () => {
    expect(findCredentialGaps([TYPE_A], [{ typeId: TYPE_B, expiresOn: null }], period)).toEqual([
      { typeId: TYPE_A, reason: 'MISSING', expiresOn: null },
    ]);
  });

  it('만료일이 없거나 투입 종료일 이후까지 유효하면 통과', () => {
    expect(findCredentialGaps([TYPE_A], [{ typeId: TYPE_A, expiresOn: null }], period)).toEqual([]);
    expect(
      findCredentialGaps([TYPE_A], [{ typeId: TYPE_A, expiresOn: '2026-10-30' }], period),
    ).toEqual([]);
  });

  it('투입 시작 전에 모두 만료면 자격 만료', () => {
    expect(
      findCredentialGaps([TYPE_A], [{ typeId: TYPE_A, expiresOn: '2026-10-19' }], period),
    ).toEqual([{ typeId: TYPE_A, reason: 'EXPIRED', expiresOn: '2026-10-19' }]);
  });

  it('투입 기간 중에 만료되면 투입 중 만료', () => {
    expect(
      findCredentialGaps([TYPE_A], [{ typeId: TYPE_A, expiresOn: '2026-10-25' }], period),
    ).toEqual([{ typeId: TYPE_A, reason: 'EXPIRES_DURING', expiresOn: '2026-10-25' }]);
  });

  it('같은 종류 서류가 여러 장이면 가장 늦은 만료일로 판단한다 (갱신본이 있으면 통과)', () => {
    expect(
      findCredentialGaps(
        [TYPE_A],
        [
          { typeId: TYPE_A, expiresOn: '2025-01-01' },
          { typeId: TYPE_A, expiresOn: '2028-01-01' },
        ],
        period,
      ),
    ).toEqual([]);
  });
});

describe('sortCredentials', () => {
  it('만료가 빠른 순이고 만료일이 없는 서류는 맨 뒤', () => {
    const items = [
      { id: 'n', expiresOn: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', expiresOn: '2027-01-01', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'a', expiresOn: '2026-12-01', createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    expect(sortCredentials(items).map((item) => item.id)).toEqual(['a', 'b', 'n']);
  });
});

describe('서류 입력 규칙', () => {
  it('만료일이 취득일보다 빠르면 거부', () => {
    const result = credentialCreateSchema.safeParse({
      typeId: TYPE_A,
      issuedOn: '2026-05-01',
      expiresOn: '2026-04-30',
    });

    expect(result.success).toBe(false);
  });

  it('종류만 있어도 등록할 수 있다', () => {
    expect(credentialCreateSchema.safeParse({ typeId: TYPE_A }).success).toBe(true);
  });

  it('수정은 바꿀 값이 하나는 있어야 하고 null로 값을 지울 수 있다', () => {
    expect(credentialUpdateSchema.safeParse({}).success).toBe(false);
    expect(credentialUpdateSchema.safeParse({ expiresOn: null }).success).toBe(true);
  });
});

describe('직원 서류 업로드 신청', () => {
  it('이미지와 PDF만 올릴 수 있고 Word 문서는 거부', () => {
    const base = { name: '자격증.pdf', contentType: 'application/pdf', size: 1000 };

    expect(employeeFileUploadRequestSchema.safeParse(base).success).toBe(true);
    expect(
      employeeFileUploadRequestSchema.safeParse({
        name: '서류.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1000,
      }).success,
    ).toBe(false);
  });

  it('프로젝트 파일 신청으로는 직원 서류 용도를 쓸 수 없다', () => {
    expect(
      fileUploadRequestSchema.safeParse({
        purpose: 'EMPLOYEE_DOCUMENT',
        name: 'a.pdf',
        contentType: 'application/pdf',
        size: 10,
      }).success,
    ).toBe(false);
  });
});
