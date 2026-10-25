import { FlaskConical } from 'lucide-react';

import { useMe } from '../auth/useMe';

// 공개 시연 계정으로 로그인한 동안 화면 위에 계속 보이는 안내 (모든 데이터가 가상이고 매일 새벽 초기화됨을 알림)
export const DemoBanner = () => {
  const me = useMe();

  if (!me.data?.isDemo) {
    return null;
  }

  return (
    <div
      role="note"
      className="flex items-center gap-2 bg-[#14110d] px-4 py-2 text-[12.5px] font-medium text-[#d9cfb9] md:px-11 print:hidden"
    >
      <FlaskConical aria-hidden className="size-4 shrink-0 text-accent" />
      <p>시연용 체험 환경입니다. 모든 데이터는 가상이며 매일 새벽에 처음 상태로 초기화됩니다</p>
    </div>
  );
};
