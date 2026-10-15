import { ALERT_KIND_LABELS, type AlertKind } from '@field-note/shared';

import { Alert } from '../components/ui/alert';
import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { Switch } from '../components/ui/switch';
import { useAlertSettings, useSaveAlertSettings } from '../dashboard/useDashboard';

// 알림을 성격별로 묶어서 보여 준다 (모든 알림 종류가 한 묶음에 들어가야 함)
const GROUPS: { title: string; description: string; kinds: AlertKind[] }[] = [
  {
    title: '작업 내역',
    description: '매일 챙겨야 할 기록',
    kinds: ['NO_LOG_TODAY'],
  },
  {
    title: '공수·일정',
    description: '프로젝트가 계획보다 어긋날 때',
    kinds: ['BURN_REACHED', 'BURN_AHEAD', 'PROJECT_OVERDUE', 'DOUBLE_ASSIGNED'],
  },
  {
    title: '변경·보증',
    description: '완료 이후까지 이어지는 확인 사항',
    kinds: ['CHANGE_STALE', 'WARRANTY_ENDING', 'REPAIR_UNHANDLED', 'CERTIFICATE_EXPIRING'],
  },
  {
    title: '직원·정산',
    description: '서류 만료와 월 마감',
    kinds: ['CREDENTIAL_EXPIRING', 'MONTH_UNCLOSED'],
  },
];

// 설정 > 알림 설정: 알림 종류별로 켜고 끈다 (서비스 기획서 §15.3). 알림은 홈 화면에 표시된다
export const AlertSettingsPage = () => {
  const settings = useAlertSettings();
  const save = useSaveAlertSettings();
  const enabledByKind = new Map((settings.data ?? []).map((item) => [item.kind, item.enabled]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink to="/settings">설정으로</BackLink>
        <PageHeader
          title="알림 설정"
          description="홈 화면에 보여 줄 알림을 종류별로 켜고 끕니다. 꺼도 대시보드의 현황은 그대로 보입니다"
        />
      </div>
      {settings.isError && <Alert>알림 설정을 불러오지 못했습니다</Alert>}
      {save.isError && <Alert>저장하지 못했습니다. 다시 시도해 주세요</Alert>}
      {settings.isPending && <p className="text-sm">불러오는 중</p>}
      {settings.data && (
        <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {GROUPS.map((group) => (
            <section
              key={group.title}
              aria-label={group.title}
              className="flex flex-col gap-1 rounded-xl bg-surface-subtle p-5"
            >
              <h2 className="text-lg font-bold">{group.title}</h2>
              <p className="mb-2 text-sm text-foreground/70">{group.description}</p>
              <ul className="divide-y divide-line">
                {group.kinds.map((kind) => (
                  <li key={kind}>
                    <label className="flex min-h-touch items-center justify-between gap-4 py-2">
                      <span className="text-sm">{ALERT_KIND_LABELS[kind]}</span>
                      <Switch
                        checked={enabledByKind.get(kind) ?? false}
                        disabled={save.isPending}
                        onCheckedChange={(checked) =>
                          save.mutate({ items: [{ kind, enabled: checked }] })
                        }
                        aria-label={ALERT_KIND_LABELS[kind]}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
