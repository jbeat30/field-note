import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type PageHeaderProps = {
  title: ReactNode;
  // 제목 위 작은 글자(프로젝트 코드·상태 등)
  eyebrow?: ReactNode;
  description?: ReactNode;
  // 오른쪽 버튼 묶음
  actions?: ReactNode;
  // 다른 제목 아래에 놓일 때는 2 (프로젝트 작업 공간 안의 화면 등)
  level?: 1 | 2;
  // 아래 첫 카드가 평면 경계에 걸치도록 평면을 더 길게 깖 (홈의 지표 타일)
  overlap?: boolean;
  // 제목 위 돌아가기 링크 (평면 안에 함께 놓임)
  back?: ReactNode;
  // 제목 아래 평면 안에 놓는 탭 (직원 목록과 단가표 같은 화면 전환)
  tabs?: ReactNode;
  // 홈처럼 큰 인사 제목
  isDisplay?: boolean;
};

// 화면 맨 위 제목 줄: 넓은 화면은 제목 왼쪽·버튼 오른쪽, 좁은 화면은 위아래로 쌓임 (큰 인사 제목은 버튼이 많아 태블릿 폭까지 쌓음)
// 1단계 제목은 스스로 주황 평면을 깔고 그 안의 글자색은 평면이 정함
export const PageHeader = ({
  title,
  eyebrow,
  description,
  actions,
  level = 1,
  overlap = false,
  back,
  tabs,
  isDisplay = false,
}: PageHeaderProps) => {
  const Heading = level === 1 ? 'h1' : 'h2';

  const header = (
    <header
      className={cn(
        'flex gap-3',
        // 큰 인사 제목은 넓은 화면(xl)부터 옆에 버튼을 두고, 그 밖의 제목은 제목 오른쪽에 버튼을 두고 모자라면 줄을 바꿈
        isDisplay
          ? 'flex-col xl:flex-row xl:items-start xl:justify-between'
          : 'flex-wrap items-end justify-between sm:flex-row sm:justify-between',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            {eyebrow}
          </div>
        )}
        <Heading
          className={
            level === 1
              ? cn(
                  '[line-height:1.08] font-extrabold tracking-[-0.03em] break-keep',
                  isDisplay
                    ? 'text-[40px] md:text-[clamp(44px,4.4vw,72px)]'
                    : 'text-[34px] md:text-[46px]',
                )
              : 'text-xl font-extrabold tracking-[-0.02em] break-keep'
          }
        >
          {title}
        </Heading>
        {description && <p className="text-sm font-medium text-sub">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );

  // 1단계 제목은 주황 평면 위에 놓음, 2단계는 바탕 위에 그대로
  return level === 1 ? (
    <div
      className={cn(
        'plane pt-4 md:pt-10',
        overlap ? 'pb-24 md:pb-[12.5rem]' : 'plane-page pb-12 md:pb-14',
      )}
    >
      {back && <div className="pb-1">{back}</div>}
      {header}
      {tabs && <div className="mt-5">{tabs}</div>}
    </div>
  ) : (
    header
  );
};
