import { getLegalDocumentContent, type LegalDocumentType } from '@field-note/shared';
import { Link, useParams } from 'react-router';

import { LegalDocumentBody } from './LegalDocumentBody';

const SLUG_TO_TYPE: Record<string, LegalDocumentType> = {
  terms: 'TERMS_OF_SERVICE',
  privacy: 'PRIVACY_POLICY',
  marketing: 'MARKETING',
};

// 약관·개인정보 처리방침 전문 (로그인·가입 화면과 설정 하단에서 항상 볼 수 있음)
export const LegalPage = () => {
  const { slug = '' } = useParams();
  const type = SLUG_TO_TYPE[slug];

  if (!type) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
          문서를 찾을 수 없습니다
        </h1>
        <Link
          className="min-h-touch content-center font-bold underline decoration-accent decoration-2 underline-offset-4"
          to="/login"
        >
          로그인 화면으로
        </Link>
      </section>
    );
  }

  return (
    // 화면 높이에 맞춰 틀(로그인 전 공통 틀의 여백·머리글·바닥글)을 뺀 만큼만 쓰고, 긴 본문은 안쪽에서만 스크롤
    <article className="flex max-h-[calc(100dvh-18rem)] min-h-72 flex-col gap-5 lg:max-h-[calc(100dvh-14rem)]">
      <div
        role="region"
        aria-label={`${getLegalDocumentContent(type).title} 전문`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto pr-2 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <LegalDocumentBody content={getLegalDocumentContent(type)} />
      </div>
      <nav aria-label="다른 문서" className="flex flex-wrap gap-x-4 border-t border-border pt-3">
        {Object.entries(SLUG_TO_TYPE).map(([itemSlug, itemType]) => (
          <Link
            key={itemSlug}
            className="min-h-touch content-center text-sm font-bold underline decoration-accent decoration-2 underline-offset-4"
            to={`/legal/${itemSlug}`}
          >
            {getLegalDocumentContent(itemType).title}
          </Link>
        ))}
        <Link
          className="min-h-touch content-center text-sm font-bold underline decoration-accent decoration-2 underline-offset-4"
          to="/login"
        >
          로그인 화면으로
        </Link>
      </nav>
    </article>
  );
};
