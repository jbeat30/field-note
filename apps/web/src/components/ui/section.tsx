import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

type SectionProps = Omit<ComponentProps<'section'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  // 제목 오른쪽 동작 (보조 버튼·"전체 보기" 등)
  actions?: ReactNode;
  // 화면 제목 아래면 h2, 구역 안의 작은 묶음이면 h3
  level?: 2 | 3;
  // 위 구역과 구분선으로 나눔 (같은 화면에 구역이 이어질 때)
  divided?: boolean;
};

// 카드 없이 제목·설명·오른쪽 동작·내용만 있는 구역. 화면의 주 구역은 카드 대신 이것으로 나눈다
export const Section = ({
  title,
  description,
  actions,
  level = 2,
  divided = false,
  className,
  children,
  ...props
}: SectionProps) => {
  const Heading = level === 2 ? 'h2' : 'h3';
  // 제목으로 이름 붙은 영역 (화면 읽기 프로그램의 구역 이동)
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-4', divided && 'border-t border-line pt-6', className)}
      {...props}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading
            id={headingId}
            className={cn(
              'font-semibold tracking-tight break-keep',
              level === 2 ? 'text-lg' : 'text-base',
            )}
          >
            {title}
          </Heading>
          {description && <p className="text-sm text-foreground/65">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
};
