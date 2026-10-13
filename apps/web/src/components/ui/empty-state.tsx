import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  // 다음 행동을 안내하는 버튼·링크
  action?: ReactNode;
  icon?: ReactNode;
};

// 목록이 비었을 때 이유와 다음 행동을 안내
export const EmptyState = ({ title, description, action, icon }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface-nested px-4 py-12 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-surface text-foreground/50 ring-1 ring-line">
      {icon ?? <Inbox aria-hidden className="size-6" />}
    </span>
    <div className="flex flex-col gap-1">
      <p className="text-base font-bold">{title}</p>
      {description && <p className="text-sm text-foreground/70">{description}</p>}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
);
