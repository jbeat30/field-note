import { useId, type ReactNode } from 'react';

import { cn } from '../lib/cn';

type SettingsCardProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

// 설정 화면의 카드 한 장: 제목과 설명을 위에 두고 내용을 아래에 쌓음
export const SettingsCard = ({ title, description, children, className }: SettingsCardProps) => {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-4 rounded-[30px] bg-surface-subtle p-5 sm:p-7', className)}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-[19px] font-extrabold tracking-tight"
        >
          {title}
        </h2>
        {description && <p className="text-sm text-sub">{description}</p>}
      </div>
      {children}
    </section>
  );
};
