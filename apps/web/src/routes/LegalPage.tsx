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
        <h1 className="text-xl font-bold">문서를 찾을 수 없습니다</h1>
        <Link className="min-h-touch content-center text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </section>
    );
  }

  return (
    <article className="flex flex-col gap-5">
      <LegalDocumentBody content={getLegalDocumentContent(type)} />
      <nav aria-label="다른 문서" className="flex flex-wrap gap-x-4 border-t border-border pt-3">
        {Object.entries(SLUG_TO_TYPE).map(([itemSlug, itemType]) => (
          <Link
            key={itemSlug}
            className="min-h-touch content-center text-sm text-primary underline"
            to={`/legal/${itemSlug}`}
          >
            {getLegalDocumentContent(itemType).title}
          </Link>
        ))}
        <Link className="min-h-touch content-center text-sm text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </nav>
    </article>
  );
};
