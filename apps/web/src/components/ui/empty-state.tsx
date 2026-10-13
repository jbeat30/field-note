import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  // 다음 행동을 안내하는 버튼·링크
  action?: ReactNode;
};

// 목록이 비었을 때 이유와 다음 행동을 안내
export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-subtle px-4 py-10 text-center">
    <p className="text-base font-bold">{title}</p>
    {description && <p className="text-sm text-foreground/70">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
