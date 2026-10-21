import { UNSAFE_DataRouterContext, useBlocker } from 'react-router';
import { useContext, useEffect } from 'react';

import { useConfirm } from '../components/ui/confirm-dialog';

import { LEAVE_CONFIRM } from './useLeaveConfirm';

type LeaveGuardProps = {
  // 임시 파일이 있을 때만 이탈을 막음
  active: boolean;
  // 이탈을 확인받으면 임시 파일을 지움
  onLeave: () => Promise<unknown>;
};

const BlockerGuard = ({ active, onLeave }: LeaveGuardProps) => {
  const { confirm, dialog } = useConfirm();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      active && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    void confirm(LEAVE_CONFIRM).then(async (ok) => {
      if (!ok) {
        blocker.reset();

        return;
      }

      await onLeave();
      blocker.proceed();
    });
    // 막힌 상태가 새로 생길 때 한 번만 확인 창을 띄움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  return dialog;
};

// 폼에서 화면 이동(뒤로가기·메뉴 이동)을 확인받는 가드, 라우터가 없는 환경(스토리 등)에서는 아무것도 하지 않음
export const LeaveGuard = (props: LeaveGuardProps) => {
  const router = useContext(UNSAFE_DataRouterContext);

  return router ? <BlockerGuard {...props} /> : null;
};
