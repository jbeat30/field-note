import type { ReactNode } from 'react';

// 입력 단계 하나 (번호·제목·설명·오른쪽 도구), 위에서 아래로 순서대로 입력
export const WorkStep = ({
  number,
  title,
  description,
  aside,
  children,
}: {
  number: number;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) => (
  <section
    className="flex flex-col gap-4 rounded-xl bg-surface-subtle p-4 md:p-5"
    aria-labelledby={`step-${number}`}
  >
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-surface"
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={`step-${number}`} className="text-lg font-semibold">
            {title}
          </h3>
          <p className="text-sm text-sub">{description}</p>
        </div>
      </div>
      {aside}
    </header>
    {children}
  </section>
);
