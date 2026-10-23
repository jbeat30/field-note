import { DEFAULT_COMPANY_RULES, companyRulesSchema, type CompanyRules } from '@field-note/shared';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { getErrorMessage } from '../lib/apiError';

import { useCompanyRules, useSaveCompanyRules } from './useCompanyRules';

type Fields = Record<keyof CompanyRules, string>;

const toFields = (rules: CompanyRules): Fields => ({
  burnWarnPercent: String(rules.burnWarnPercent),
  burnLimitPercent: String(rules.burnLimitPercent),
  aheadGapPercent: String(rules.aheadGapPercent),
  warrantyDefaultMonths: String(rules.warrantyDefaultMonths),
});

const LABELS: { key: keyof CompanyRules; label: string; unit: string; hint: string }[] = [
  {
    key: 'burnWarnPercent',
    label: '공수 소진율 경고',
    unit: '%',
    hint: '계획 공수의 이 비율을 쓰면 "경고"로 표시합니다',
  },
  {
    key: 'burnLimitPercent',
    label: '공수 소진율 한도',
    unit: '%',
    hint: '이 비율에 닿으면 "한도 도달"로 표시합니다 (경고 기준보다 커야 합니다)',
  },
  {
    key: 'aheadGapPercent',
    label: '진행률과의 간격',
    unit: '%p',
    hint: '공수 소진율이 진행률보다, 또는 진행률이 일정 경과율보다 이만큼 앞서·뒤처지면 경고합니다',
  },
  {
    key: 'warrantyDefaultMonths',
    label: '보증 기본 기간',
    unit: '개월',
    hint: '프로젝트를 완료할 때 따로 정하지 않으면 이 기간으로 보증을 시작합니다 (0은 보증 없음)',
  },
];

const card = 'flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5';

// 회사 관리의 경고·보증 기준: 공수 소진율 경고·한도, 진행률 간격, 보증 기본 기간
export const CompanyRulesForm = () => {
  const rules = useCompanyRules();
  const save = useSaveCompanyRules();
  const [fields, setFields] = useState<Fields | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyRules, string>>>({});
  const [message, setMessage] = useState('');
  // 서버 값이 도착하면 입력칸을 채움 (고치는 중에는 덮어쓰지 않음)
  const current = fields ?? (rules.data ? toFields(rules.data) : null);

  if (rules.isError) {
    return <Alert>경고 기준을 불러오지 못했습니다</Alert>;
  }

  if (!current) {
    return <p className="text-sm">불러오는 중</p>;
  }

  const change = (key: keyof CompanyRules, value: string) => {
    setMessage('');
    setErrors({});
    setFields({ ...current, [key]: value });
  };

  const submit = () => {
    const parsed = companyRulesSchema.safeParse({
      burnWarnPercent: Number(current.burnWarnPercent),
      burnLimitPercent: Number(current.burnLimitPercent),
      aheadGapPercent: Number(current.aheadGapPercent),
      warrantyDefaultMonths: Number(current.warrantyDefaultMonths),
    });

    if (!parsed.success) {
      const next: Partial<Record<keyof CompanyRules, string>> = {};

      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof CompanyRules] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    save.mutate(parsed.data, {
      onSuccess: (saved) => {
        setFields(toFields(saved));
        setMessage('저장했습니다');
      },
      onError: (error) => setMessage(getErrorMessage(error)),
    });
  };

  return (
    <div className={card}>
      <p className="text-sm text-sub">
        프로젝트 현황·대시보드 알림의 경고 기준과 보증 기본 기간입니다. 바꾸면 모든 프로젝트에 바로
        적용됩니다
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {LABELS.map((item) => (
          <FormField key={item.key} label={item.label} hint={item.hint} error={errors[item.key]}>
            <Input
              type="number"
              inputMode="numeric"
              endAdornment={item.unit}
              value={current[item.key]}
              onChange={(event) => change(item.key, event.target.value)}
            />
          </FormField>
        ))}
      </div>
      {message && (
        <Alert variant={message === '저장했습니다' ? 'info' : undefined}>{message}</Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={submit} disabled={save.isPending}>
          {save.isPending ? '저장 중' : '기준 저장'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setMessage('');
            setErrors({});
            setFields(toFields(DEFAULT_COMPANY_RULES));
          }}
        >
          기본값으로
        </Button>
      </div>
    </div>
  );
};
