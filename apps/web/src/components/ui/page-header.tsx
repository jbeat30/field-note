import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type PageHeaderProps = {
  title: string;
  // 제목 위 작은 글자(프로젝트 코드·상태 등)
  eyebrow?: ReactNode;
  description?: ReactNode;
  // 오른쪽 버튼 묶음
  actions?: ReactNode;
  // 다른 제목 아래에 놓일 때는 2 (프로젝트 작업 공간 안의 화면 등)
  level?: 1 | 2;
  // 아래 첫 카드가 평면 경계에 걸치도록 평면을 더 길게 깖 (홈의 지표 타일)
  overlap?: boolean;
};

// 화면 맨 위 제목 줄: 넓은 화면은 제목 왼쪽·버튼 오른쪽, 좁은 화면은 위아래로 쌓임
// 1단계 제목은 스스로 주황 평면을 깔고 그 안의 글자색은 평면이 정함
export const PageHeader = ({
  title,
  eyebrow,
  description,
  actions,
  level = 1,
  overlap = false,
}: PageHeaderProps) => {
  const Heading = level === 1 ? 'h1' : 'h2';

  const header = (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/75">
            {eyebrow}
          </div>
        )}
        <Heading
          className={
            level === 1
              ? 'text-[34px] leading-[1.08] font-extrabold tracking-[-0.03em] break-keep md:text-[46px]'
              : 'text-xl font-extrabold tracking-[-0.02em] break-keep'
          }
        >
          {title}
        </Heading>
        {description && <p className="text-sm font-medium text-foreground/75">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );

  // 1단계 제목은 주황 평면 위에 놓음, 2단계는 바탕 위에 그대로
  return level === 1 ? (
    <div className={cn('plane pt-3 md:pt-0', overlap ? 'pb-24 md:pb-28' : 'pb-10 md:pb-12')}>
      {header}
    </div>
  ) : (
    header
  );
};
