import { ALERT_KIND_LABELS } from '@field-note/shared';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { useAlertSettings, useSaveAlertSettings } from '../dashboard/useDashboard';

// 설정 > 알림 설정: 알림 종류별로 켜고 끈다 (서비스 기획서 §15.3). 알림은 홈 화면에 표시된다
export const AlertSettingsPage = () => {
  const settings = useAlertSettings();
  const save = useSaveAlertSettings();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link className="min-h-touch content-center text-sm text-primary underline" to="/settings">
          ← 설정으로
        </Link>
        <h1 className="text-2xl font-bold">알림 설정</h1>
        <p className="text-sm text-foreground/70">
          홈 화면에 보여 줄 알림을 고릅니다. 꺼도 대시보드의 현황은 그대로 보입니다
        </p>
      </div>
      {settings.isError && <Alert>알림 설정을 불러오지 못했습니다</Alert>}
      {save.isError && <Alert>저장하지 못했습니다. 다시 시도해 주세요</Alert>}
      {settings.isPending && <p className="text-sm">불러오는 중</p>}
      {settings.data && (
        <ul className="flex flex-col gap-1">
          {settings.data.map((item) => (
            <li key={item.kind}>
              <label className="flex min-h-touch items-center gap-3">
                <Checkbox
                  checked={item.enabled}
                  disabled={save.isPending}
                  onCheckedChange={(checked) =>
                    save.mutate({ items: [{ kind: item.kind, enabled: checked === true }] })
                  }
                  aria-label={ALERT_KIND_LABELS[item.kind]}
                />
                <span>{ALERT_KIND_LABELS[item.kind]}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
