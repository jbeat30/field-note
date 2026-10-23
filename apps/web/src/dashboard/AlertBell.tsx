import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Modal } from '../components/ui/modal';
import { cn } from '../lib/cn';

import { AlertList } from './AlertList';
import { useDashboard, useDismissAlerts } from './useDashboard';

// 개수 표시는 9개까지, 그 위는 9+
const countLabel = (count: number) => (count > 9 ? '9+' : String(count));

// 메뉴의 알림 버튼: 안 숨긴 알림 개수를 달고, 누르면 알림 목록 창이 열림 (급한 알림이 있으면 붉은 개수)
export const AlertBell = ({ className }: { className?: string }) => {
  const dashboard = useDashboard();
  const dismiss = useDismissAlerts();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const alerts = dashboard.data?.dashboard.alerts ?? [];
  const today = dashboard.data?.dashboard.today ?? '';
  const hasUrgent = alerts.some((item) => item.urgent);

  const dismissAll = async () => {
    const ok = await confirm({
      title: `알림 ${alerts.length}건을 모두 숨길까요?`,
      description: '같은 조건에서는 다시 나오지 않고, 조건이 바뀌면 다시 보입니다',
      confirmLabel: '모두 숨기기',
    });

    if (ok) dismiss.mutate(alerts.map((item) => item.key));
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={alerts.length > 0 ? `알림 ${alerts.length}건` : '알림'}
        className={cn(
          'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-foreground transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:size-14',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Bell aria-hidden className="size-5 md:size-6" />
        {alerts.length > 0 && (
          <span
            aria-hidden
            className={cn(
              'absolute -top-1 -right-1 min-w-5 rounded-full px-1 text-center font-emphasis text-[11px] leading-5 font-bold md:min-w-[22px] md:text-xs md:leading-[22px]',
              hasUrgent ? 'bg-danger text-white' : 'bg-[#14110d] text-accent',
            )}
          >
            {countLabel(alerts.length)}
          </span>
        )}
      </button>
      <Modal open={open} onOpenChange={setOpen} title="알림" size="lg">
        {dashboard.isError && <Alert>알림을 불러오지 못했습니다</Alert>}
        {dismiss.isError && <Alert>숨기지 못했습니다. 다시 시도해 주세요</Alert>}
        {dashboard.data && alerts.length === 0 && (
          <p className="text-sm text-sub">지금 확인할 알림이 없습니다</p>
        )}
        {alerts.length > 0 && (
          <AlertList
            alerts={alerts}
            today={today}
            disabled={dismiss.isPending}
            isModal
            onDismiss={(keys) => dismiss.mutate(keys)}
          />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Button asChild variant="secondary" size="lg" className="rounded-full">
            <Link to="/settings/alerts" onClick={() => setOpen(false)}>
              알림 설정
            </Link>
          </Button>
          {alerts.length > 1 && (
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              disabled={dismiss.isPending}
              onClick={dismissAll}
            >
              모두 숨기기
            </Button>
          )}
        </div>
        {dashboard.data && dashboard.data.dashboard.hiddenAlertCount > 0 && (
          <p className="text-xs text-sub">
            숨긴 알림 {dashboard.data.dashboard.hiddenAlertCount}건은 조건이 바뀌면 다시 나옵니다
          </p>
        )}
      </Modal>
      {dialog}
    </>
  );
};
