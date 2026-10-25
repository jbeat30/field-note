import { getLegalDocumentContent, type LegalDocumentType } from '@field-note/shared';
import { Link, useParams } from 'react-router';

import { Button } from '../components/ui/button';
import { cn } from '../lib/cn';
import { useMe } from '../auth/useMe';
import { BrandLogo } from '../layouts/BrandLogo';

import { LegalDocumentBody } from './LegalDocumentBody';

const SLUG_TO_TYPE: Record<string, LegalDocumentType> = {
  terms: 'TERMS_OF_SERVICE',
  privacy: 'PRIVACY_POLICY',
};

const SECTION_ID = 'legal-section';

// 2026-10-21T00:00:00.000Z → 2026.10.21
const dotted = (iso: string) => iso.slice(0, 10).replaceAll('-', '.');

// 약관·개인정보 처리방침 전문: 주황 평면 제목 아래에 목차와 문서 카드, 로그인 전 어디서든 열 수 있음
export const LegalPage = () => {
  const { slug = '' } = useParams();
  const me = useMe();
  const type = SLUG_TO_TYPE[slug];

  if (!type) {
    return (
      <div className="auth-light min-h-dvh bg-surface px-4 py-12 text-foreground">
        <section className="mx-auto flex max-w-xl flex-col gap-3">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
            문서를 찾을 수 없습니다
          </h1>
          <Link className="min-h-touch content-center font-bold hover:text-sub" to="/login">
            로그인 화면으로
          </Link>
        </section>
      </div>
    );
  }

  const content = getLegalDocumentContent(type);

  return (
    <div className="auth-light relative min-h-dvh bg-[#14110d] text-[#14110d]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[300px] bg-accent md:h-[380px]" />
      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pt-9 pb-32 md:px-12 md:pt-12">
        <BrandLogo size="lg" />
        <header className="flex flex-col gap-3">
          <p className="text-[15px] font-bold">
            {dotted(content.effectiveAt)} 적용 · 버전 {content.version}
          </p>
          <h1 className="text-[44px] leading-[1.02] font-extrabold tracking-[-0.03em] break-keep md:text-[72px]">
            {content.title}
          </h1>
        </header>
        <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <nav
            aria-label="목차"
            className="flex flex-col gap-1 rounded-[32px] bg-surface p-4 text-foreground lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto"
          >
            <p className="px-2 pt-1 pb-1 text-[12.5px] font-bold tracking-wide text-sub">문서</p>
            <div className="flex flex-col gap-2 px-1 pb-2 md:flex-row lg:flex-col">
              {Object.entries(SLUG_TO_TYPE).map(([itemSlug, itemType]) => (
                <Link
                  key={itemSlug}
                  to={`/legal/${itemSlug}`}
                  aria-current={itemSlug === slug ? 'page' : undefined}
                  className={cn(
                    'flex min-h-touch flex-1 items-center justify-center rounded-2xl px-2 text-center text-sm font-bold break-keep',
                    itemSlug === slug
                      ? 'bg-[#14110d] text-[#fcf9f2]'
                      : 'bg-field text-foreground hover:bg-line',
                  )}
                >
                  {getLegalDocumentContent(itemType).title}
                </Link>
              ))}
            </div>
            <ol className="hidden flex-col gap-0.5 lg:flex">
              {content.sections.map((section, index) => (
                <li key={section.heading}>
                  <a
                    href={`#${SECTION_ID}-${index}`}
                    className="flex min-h-touch items-center rounded-2xl px-4 text-[14.5px] font-bold text-sub hover:bg-field hover:text-foreground"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article
            aria-label={`${content.title} 전문`}
            className="rounded-[36px] bg-surface p-6 text-foreground md:px-12 md:py-10"
          >
            <LegalDocumentBody content={content} showTitle={false} sectionIdPrefix={SECTION_ID} />
          </article>
        </div>
      </div>
      <div className="fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 rounded-[28px] bg-[#241f18] px-5 py-3 text-[#f4eee0] print:hidden md:inset-x-12 md:px-6">
        <p className="text-sm font-medium text-[#b3a78f] max-md:hidden">
          동의는 가입 화면에서 해요.
        </p>
        <div className="flex gap-2 max-md:w-full max-md:justify-end">
          <Button asChild variant="soft">
            {me.data ? (
              <Link to="/settings?tab=etc">설정으로 돌아가기</Link>
            ) : (
              <Link to="/login">로그인으로 돌아가기</Link>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
