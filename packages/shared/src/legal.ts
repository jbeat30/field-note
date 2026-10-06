import { LEGAL_DOCUMENT_META, type LegalDocumentType } from './account';

// 약관·처리방침 본문 (서비스 기획서 §5.5~§5.13, §6)
// 화면에 보이는 내용과 동의 이력의 본문 해시가 같은 원본에서 나오도록 코드로 관리한다.
// 본문을 바꾸면 반드시 version을 올린다 (같은 version에서 내용이 달라지면 운영자 등록이 거부됨)
// 아래 문서는 초안이며, 서비스 공개 전에 전문가 검토를 거쳐 확정한다 (§18.2)

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: readonly string[] }
  | { type: 'table'; headers: readonly string[]; rows: readonly (readonly string[])[] };

export type LegalSection = { heading: string; blocks: readonly LegalBlock[] };

export type LegalDocumentContent = {
  type: LegalDocumentType;
  version: string;
  // 이 버전의 시행 시각 (ISO)
  effectiveAt: string;
  title: string;
  isRequired: boolean;
  path: string;
  // 확정 전에 채워야 하는 항목 (화면 상단 초안 안내에 표시)
  pendingItems: readonly string[];
  sections: readonly LegalSection[];
};

const p = (text: string): LegalBlock => ({ type: 'paragraph', text });
const list = (...items: string[]): LegalBlock => ({ type: 'list', items });

const VERSION = '2026-10-06';
const EFFECTIVE_AT = '2026-10-06T00:00:00.000Z';

const termsOfService: LegalDocumentContent = {
  type: 'TERMS_OF_SERVICE',
  version: VERSION,
  effectiveAt: EFFECTIVE_AT,
  ...LEGAL_DOCUMENT_META.TERMS_OF_SERVICE,
  isRequired: true,
  pendingItems: [
    '서비스 운영자의 이름(상호)과 연락 방법',
    '책임 제한과 분쟁 해결(관할) 조항의 법률 검토',
    '회사와 운영자 사이 개인정보 처리 위탁 조항의 법률 검토',
  ],
  sections: [
    {
      heading: '제1조 (목적)',
      blocks: [
        p(
          '이 약관은 현장 팀의 프로젝트·인력·작업일지 기록을 돕는 서비스 "field-note"(이하 "서비스")의 이용 조건과 운영자·이용자의 권리와 의무를 정합니다.',
        ),
      ],
    },
    {
      heading: '제2조 (이용자와 계정)',
      blocks: [
        list(
          '서비스는 운영자가 초대한 회사의 관리자만 이용할 수 있으며, 누구나 가입하는 공개 가입은 없습니다.',
          '한 회사에 계정은 하나이고, 한 계정은 한 회사에만 속합니다. 직원(팀원)과 고객은 서비스에 접속하지 않습니다.',
          '이용자는 만 14세 이상이어야 하며, 가입할 때 이를 확인합니다.',
          '계정과 비밀번호는 이용자가 직접 관리하며, 타인에게 알려 주거나 여러 사람이 나누어 쓰는 것을 권장하지 않습니다.',
        ),
      ],
    },
    {
      heading: '제3조 (서비스 내용)',
      blocks: [
        p(
          '서비스는 프로젝트별 투입 인원·공수·작업일지·자재·사진 등 현장 기록을 입력하고 집계하는 기능을 제공합니다.',
        ),
        p(
          '운영자는 서비스 개선과 점검을 위해 서비스의 일부를 변경하거나 일시 중단할 수 있으며, 중요한 변경은 미리 알립니다.',
        ),
      ],
    },
    {
      heading: '제4조 (이용자의 의무)',
      blocks: [
        list(
          '법령과 이 약관을 지키고, 서비스를 정상적인 업무 목적으로만 사용합니다.',
          '직원·고객 등 제3자의 개인정보를 입력할 때에는 그 사람에게 알리고 필요한 동의를 받을 책임이 회사(이용자)에게 있습니다.',
          '주민등록번호와 계좌번호는 입력하지 않으며, 사진·서류에 보이면 가리고 올립니다.',
          '다른 이용자의 서비스 이용을 방해하거나 보안을 우회하려는 행위를 하지 않습니다.',
        ),
      ],
    },
    {
      heading: '제5조 (개인정보 처리 위탁)',
      blocks: [
        p(
          '이용자(회사)가 서비스에 입력하는 직원 정보·사진·대화 캡처·작업일지는 회사가 업무 목적으로 정하는 정보이며, 운영자는 회사의 지시에 따라 이를 저장·보관하는 수탁자로서 다룹니다.',
        ),
        list(
          '운영자는 위탁받은 정보를 서비스 제공 외의 목적으로 이용하거나 제3자에게 제공하지 않습니다.',
          '운영자는 회사 업무 데이터를 열람하지 않습니다. 지원이 필요한 경우 이용자의 승인과 기록을 거칩니다.',
          '회사 간 데이터는 서로 볼 수 없도록 분리해 보관합니다.',
        ),
      ],
    },
    {
      heading: '제6조 (계정 해지와 데이터)',
      blocks: [
        list(
          '이용자는 언제든지 설정 화면에서 해지를 요청할 수 있습니다.',
          '해지를 요청하면 즉시 로그인이 막히고, 14일의 유예 기간 동안 취소하면 복구할 수 있습니다.',
          '유예가 끝나면 데이터 내보내기를 안내한 뒤 삭제하며, 법령에 따라 보존해야 하는 정보는 분리해 보관한 뒤 기간이 지나면 파기합니다.',
        ),
      ],
    },
    {
      heading: '제7조 (이용 제한)',
      blocks: [
        p(
          '운영자는 약관 위반, 보안 문제 등 이용 중단 사유가 있는 경우 계정을 정지할 수 있습니다. 정지 중에도 데이터는 보존하며, 사유가 해소되면 복구합니다.',
        ),
      ],
    },
    {
      heading: '제8조 (책임의 범위)',
      blocks: [
        p(
          '운영자는 서비스를 안정적으로 제공하도록 노력하지만, 천재지변·외부 서비스 장애 등 통제할 수 없는 사유로 인한 손해에 대해서는 법령이 허용하는 범위에서 책임을 제한할 수 있습니다. 이용자가 입력한 기록의 정확성은 이용자가 확인합니다.',
        ),
      ],
    },
    {
      heading: '제9조 (약관의 변경)',
      blocks: [
        p(
          '약관을 바꿀 때에는 시행 전에 서비스 안에서 알리고, 이용자에게 불리하거나 중요한 변경은 다시 동의를 받습니다. 동의한 문서의 버전과 일시는 기록으로 남습니다.',
        ),
      ],
    },
  ],
};

const privacyPolicy: LegalDocumentContent = {
  type: 'PRIVACY_POLICY',
  version: VERSION,
  effectiveAt: EFFECTIVE_AT,
  ...LEGAL_DOCUMENT_META.PRIVACY_POLICY,
  isRequired: true,
  pendingItems: [
    '개인정보 보호책임자(운영자)의 성명과 연락 방법',
    '수탁·위탁 현황: 서버·데이터베이스·파일 저장소·이메일 발송·소셜 로그인 제공자(운영 환경 확정 후 기재)',
    '국외 이전 여부: 서버나 외부 서비스가 해외에 있으면 이전 국가·항목·방법을 기재',
    '접속 기록(접속 IP·시각)의 보관 기간과 방법',
    '이용자 요청 처리 기한 (법정 기한 확인)',
  ],
  sections: [
    {
      heading: '1. 처리하는 개인정보와 목적',
      blocks: [
        p(
          '서비스는 업무에 꼭 필요한 최소한의 정보만 처리합니다. 주민등록번호, 계좌번호, 건강·종교 등 민감정보는 수집하지 않습니다.',
        ),
        {
          type: 'table',
          headers: ['구분', '항목', '목적', '보유 기간'],
          rows: [
            [
              '관리자 계정 (필수)',
              '이름 또는 상호, 이메일(인증), 아이디, 비밀번호(복원할 수 없는 형태로 암호화해 저장)',
              '가입, 본인 확인, 계정 복구, 서비스 안내',
              '해지 후 14일 유예 뒤 파기 (법령상 보존 대상은 분리 보관)',
            ],
            [
              '관리자 계정 (소셜 로그인을 쓰는 경우)',
              '소셜 로그인 제공자가 부여한 사용자 번호, 제공자가 확인해 준 이메일',
              '소셜 로그인 연동',
              '연동 해제 또는 해지 시까지',
            ],
            [
              '자동으로 생성되는 정보',
              '로그인 세션, 접속한 기기 종류(브라우저·기기 이름), 마지막 사용 시각, 쿠키',
              '로그인 유지, 보안, 기기 목록과 원격 로그아웃',
              '로그아웃·만료·해지 시 삭제',
            ],
            [
              '동의 기록',
              '동의한 문서의 종류·버전, 동의 일시, 만 14세 이상 확인 시각',
              '동의 이력 증명',
              '해지 후 유예 뒤 파기 (법령상 보존 대상은 분리 보관)',
            ],
          ],
        },
        p(
          '이용자(회사)가 업무를 위해 입력하는 직원 정보·사진·작업일지는 아래 "회사가 입력하는 정보"에서 따로 설명합니다.',
        ),
      ],
    },
    {
      heading: '2. 회사가 입력하는 정보 (처리 위탁)',
      blocks: [
        list(
          '직원 정보(이름, 직종, 선택 항목으로 생년월일·연락처·자격 서류·입퇴사일), 사진, 대화 캡처, 작업일지는 회사가 업무 목적으로 정하는 정보입니다.',
          '이 정보에 대해 운영자는 회사의 지시에 따라 저장·보관하는 수탁자이며, 직원 등 정보주체에게 알리고 필요한 동의를 받을 책임은 회사에 있습니다.',
          '사진과 서류에 제3자(얼굴, 차량 번호판, 이름·전화번호 등)가 보이면 필요한 범위에서만 올리고 가려서 올려 주세요.',
        ),
      ],
    },
    {
      heading: '3. 개인정보의 보유와 파기',
      blocks: [
        list(
          '이용 목적이 끝나면 지체 없이 파기합니다. 관리자가 해지를 요청하면 즉시 로그인이 막히고 14일의 유예 뒤 삭제합니다.',
          '법령에 따라 보존해야 하는 정보는 다른 정보와 분리해 보관하고, 기간이 지나면 파기합니다.',
          '파기는 복구할 수 없는 방법으로 합니다.',
          '장애 복구를 위한 백업본에는 삭제한 정보가 최대 30일 남을 수 있으며, 이 기간이 지나면 백업본에서도 순차적으로 삭제합니다.',
        ),
      ],
    },
    {
      heading: '4. 제3자 제공과 처리 위탁',
      blocks: [
        p(
          '운영자는 이용자의 개인정보를 이용 목적 범위를 넘어 제3자에게 제공하지 않습니다. 서비스 제공을 위해 외부 업체에 처리를 맡기는 경우 그 내용을 아래에 적습니다.',
        ),
        {
          type: 'table',
          headers: ['수탁자', '위탁하는 업무', '이전 국가'],
          rows: [
            [
              '(운영 환경 확정 후 기재)',
              '서버·데이터베이스·파일 저장소·이메일 발송·소셜 로그인',
              '(확정 후 기재)',
            ],
          ],
        },
      ],
    },
    {
      heading: '5. 정보주체의 권리',
      blocks: [
        list(
          '관리자 본인은 설정 화면에서 본인 정보 확인, 이메일 변경, 비밀번호 변경, 로그인 기기 관리, 동의 철회, 해지(삭제)를 직접 할 수 있습니다.',
          '화면에 없는 요청은 운영자에게 직접 연락해 처리합니다.',
          '직원 등 회사가 입력한 정보의 정보주체가 열람·정정·삭제를 요청하면 회사가 서비스에서 처리할 수 있습니다.',
        ),
      ],
    },
    {
      heading: '6. 쿠키와 접속 정보',
      blocks: [
        list(
          '로그인 상태를 유지하기 위해 세션 쿠키를 사용합니다. 이 쿠키는 스크립트에서 읽을 수 없고, 로그아웃하거나 만료되면 삭제됩니다.',
          '광고나 이용 행태 추적을 위한 쿠키는 사용하지 않습니다.',
          '보안과 기기 목록을 위해 접속한 기기의 종류(예: Chrome · macOS)와 마지막 사용 시각을 저장합니다.',
        ),
      ],
    },
    {
      heading: '7. 안전성 확보 조치',
      blocks: [
        list(
          '비밀번호는 복원할 수 없는 방식으로 암호화해 저장하고, 인증 코드·재설정 링크 등 1회용 값은 원문을 저장하지 않습니다.',
          '회사 간 데이터는 데이터베이스 수준에서 분리하여 다른 회사의 정보는 조회되지 않습니다.',
          '운영자는 회사의 업무 데이터를 열람하지 않으며, 운영자의 작업은 기록으로 남깁니다.',
          '비밀번호 입력 실패가 반복되면 일정 시간 로그인을 제한하고, 비밀번호·이메일 변경 시 알림 메일을 보냅니다.',
        ),
      ],
    },
    {
      heading: '8. 만 14세 미만',
      blocks: [
        p('만 14세 미만은 서비스에 가입할 수 없으며, 가입할 때 만 14세 이상임을 확인합니다.'),
      ],
    },
    {
      heading: '9. 개인정보 보호책임자',
      blocks: [
        p(
          '개인정보 보호책임자는 서비스 운영자 본인입니다. 서비스는 지인에게만 제공하므로 별도의 공개 문의 창구는 두지 않으며, 운영자에게 직접 연락해 주세요.',
        ),
      ],
    },
    {
      heading: '10. 처리방침의 변경',
      blocks: [
        p(
          '내용이 바뀌면 시행 전에 서비스 안에서 알리고, 중요한 변경은 다시 동의를 받습니다. 동의한 문서의 버전과 일시는 기록으로 남습니다.',
        ),
      ],
    },
  ],
};

const marketing: LegalDocumentContent = {
  type: 'MARKETING',
  version: VERSION,
  effectiveAt: EFFECTIVE_AT,
  ...LEGAL_DOCUMENT_META.MARKETING,
  isRequired: false,
  pendingItems: ['마케팅 정보 발송을 시작하기 전까지의 발송 항목·방법 확정'],
  sections: [
    {
      heading: '마케팅 정보 수신 동의 (선택)',
      blocks: [
        list(
          '이 동의는 선택이며, 동의하지 않아도 서비스를 이용하는 데 제한이 없습니다.',
          '현재 서비스는 광고성 정보를 보내지 않습니다. 동의한 경우에도 광고성 정보를 보내기 전에 발송 항목과 방법을 다시 알립니다.',
          '보증 종료 임박, 일지 미입력 안내처럼 서비스 이용에 필요한 안내는 광고성 정보가 아니며 이 동의와 관계없이 발송될 수 있습니다.',
          '동의는 언제든 철회할 수 있으며, 철회해도 이미 이루어진 처리에는 영향이 없습니다.',
        ),
      ],
    },
  ],
};

export const LEGAL_DOCUMENT_CONTENTS: Record<LegalDocumentType, LegalDocumentContent> = {
  TERMS_OF_SERVICE: termsOfService,
  PRIVACY_POLICY: privacyPolicy,
  MARKETING: marketing,
};

const blockText = (block: LegalBlock): string => {
  if (block.type === 'paragraph') {
    return block.text;
  }

  if (block.type === 'list') {
    return block.items.map((item) => `- ${item}`).join('\n');
  }

  return [block.headers.join(' | '), ...block.rows.map((row) => row.join(' | '))].join('\n');
};

/**
 * @description 문서의 본문 전체를 일정한 평문으로 변환 (동의 시점의 내용을 증명하는 해시의 입력)
 * 제목·버전·본문만 포함하고 초안 안내 항목은 제외 (안내 항목은 확정 과정에서 바뀌어도 동의 대상 본문이 아님)
 * @param content 문서 내용
 * @returns 평문
 */
export const legalDocumentText = (content: LegalDocumentContent) =>
  [
    `${content.title} (${content.version})`,
    ...content.sections.map((section) =>
      [section.heading, ...section.blocks.map(blockText)].join('\n'),
    ),
  ].join('\n\n');

/**
 * @description 현재 시행 중인 문서 내용 조회 (종류별 하나)
 * @param type 문서 종류
 * @returns 문서 내용
 */
export const getLegalDocumentContent = (type: LegalDocumentType) => LEGAL_DOCUMENT_CONTENTS[type];
