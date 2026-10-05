import { Plus } from 'lucide-react';
import { Outlet } from 'react-router';

import { Button } from '../components/ui/button';
import { useUiStore } from '../stores/uiStore';

// 모든 화면 공통 틀: 하단 고정 빠른 추가 버튼(한 손 조작, 터치 영역 44px 이상)
export const AppLayout = () => {
  const setQuickAddOpen = useUiStore((state) => state.setQuickAddOpen);

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 flex justify-end p-4">
        <Button aria-label="빠른 추가" onClick={() => setQuickAddOpen(true)}>
          <Plus aria-hidden className="size-5" />
          추가
        </Button>
      </div>
    </div>
  );
};
