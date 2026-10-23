import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  // 제목 위 작은 글자(프로젝트 코드·상태 등)
  eyebrow?: ReactNode;
  description?: ReactNode;
  // 오른쪽 버튼 묶음
  actions?: ReactNode;
  // 다른 제목 아래에 놓일 때는 2 (프로젝트 작업 공간 안의 화면 등)
  level?: 1 | 2;
};

// 화면 맨 위 제목 줄: 넓은 화면은 제목 왼쪽·버튼 오른쪽, 좁은 화면은 위아래로 쌓임
// 1단계 제목은 레이아웃의 주황 평면 위에 놓이며 글자색은 평면이 정함
export const PageHeader = ({
  title,
  eyebrow,
  description,
  actions,
  level = 1,
}: PageHeaderProps) => {
  const Heading = level === 1 ? 'h1' : 'h2';

  return (
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
};
