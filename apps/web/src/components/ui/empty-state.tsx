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
  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
    <span className="text-sub [&_svg]:size-7">{icon ?? <Inbox aria-hidden />}</span>
    <div className="flex flex-col gap-1">
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="text-sm text-sub">{description}</p>}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
);
