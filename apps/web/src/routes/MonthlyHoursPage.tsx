import {
  MONTH_REASON_MAX_LENGTH,
  monthOf,
  monthlyReopenSchema,
  monthlyWorkValue,
  summarizeMonthlyHours,
  todayInSeoul,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { PeriodNav } from '../components/ui/period-nav';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
import { Textarea } from '../components/ui/textarea';
import { formatDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { splitServerErrors } from '../lib/serverErrors';
import { useCloseMonth, useMonthlyHours, useReopenMonth } from '../monthly/useMonthlyHours';
import { ReportExportError, downloadMonthlyXlsx } from '../reports/exportReport';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const shiftMonth = (month: string, delta: number) => {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const total = year * 12 + (mon - 1) + delta;

  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

// 월 공수 확정과 월 공수표 (서비스 기획서 §13.2, §15.4): 한 달의 프로젝트·직원별 공수를 확인하고 임시 저장 작업 내역을 정리한 뒤 확정(잠금)한다.
// 확정은 선택 기능이며 확정한 달의 작업 내역은 재오픈(사유 기록)해야 고칠 수 있다. 확정한 표는 엑셀로 내보내 급여·정산 담당에게 전달한다
export const MonthlyHoursPage = () => {
  const [params, setParams] = useSearchParams();
  const today = todayInSeoul(new Date());
  const requested = params.get('month');
  const month = requested && MONTH_PATTERN.test(requested) ? requested : monthOf(today);
  const hours = useMonthlyHours(month);
  const close = useCloseMonth(month);
  const reopen = useReopenMonth(month);
  const [confirmDrafts, setConfirmDrafts] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [rootError, setRootError] = useState('');
  const [message, setMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isConfirmingExport, setIsConfirmingExport] = useState(false);
  const move = (delta: number) => {
    setParams({ month: shiftMonth(month, delta) });
    setConfirmDrafts(false);
    setRootError('');
    setMessage('');
  };

  const fail = (error: unknown) => {
    const { byField, root } = splitServerErrors(error, ['reason', 'confirmDrafts', 'month']);

    setReasonError(byField.reason ?? '');
    setRootError(root || byField.confirmDrafts || byField.month || '');
  };

  const doClose = () => {
    setRootError('');
    setMessage('');
    void close
      .mutateAsync({ month, ...(confirmDrafts ? { confirmDrafts: true } : {}) })
      .then(() => {
        setConfirmDrafts(false);
        setMessage(`${month} 공수를 확정했습니다`);
      })
      .catch(fail);
  };

  const doReopen = (event: FormEvent) => {
    event.preventDefault();
    setRootError('');
    setReasonError('');
    setMessage('');

    // 서버와 같은 공유 스키마로 먼저 검사해 입력칸 옆에 바로 보여 줌
    const parsed = monthlyReopenSchema.safeParse({ month, reason });

    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? '');
      return;
    }

    void reopen
      .mutateAsync(parsed.data)
      .then(() => {
        setReason('');
        setMessage(`${month} 공수를 재오픈했습니다`);
      })
      .catch(fail);
  };

  const exportXlsx = async () => {
    setIsExporting(true);
    setRootError('');
    setMessage('');

    try {
      setMessage(`${await downloadMonthlyXlsx(month)} 파일을 내려받았습니다`);
    } catch (caught) {
      setRootError(caught instanceof ReportExportError ? caught.message : '내보내지 못했습니다');
    } finally {
      setIsExporting(false);
      setIsConfirmingExport(false);
    }
  };

  if (hours.isError) {
    return <Alert>월 공수표를 불러오지 못했습니다</Alert>;
  }

  const data = hours.data;
  const settings = data && {
    standardWorkMinutes: data.standardWorkMinutes,
    monthlyWorkDays: data.monthlyWorkDays,
  };
  const summary = data ? summarizeMonthlyHours(data.rows) : null;
  const value = (minutes: number) => monthlyWorkValue(minutes, settings!);
  const isFuture = month > monthOf(today);

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/employees">직원</BackLink>
      <PageHeader title="월 공수표" description="한 달 공수를 확인하고 확정합니다" />

      <PeriodNav
        label={month}
        prevLabel="이전 달"
        nextLabel="다음 달"
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        todayLabel="이번 달"
        onToday={() => {
          setParams({});
          setMessage('');
        }}
        pickValue={`${month}-01`}
        pickMax={today}
        onPick={(date) => {
          setParams({ month: monthOf(date) });
          setMessage('');
        }}
      />

      {rootError && <Alert>{rootError}</Alert>}
      {message && <p role="status">{message}</p>}
      {!data && <p className="text-sm">불러오는 중</p>}

      {data && summary && (
        <>
          <section
            className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
            aria-labelledby="monthly-state-heading"
          >
            <h2 id="monthly-state-heading" className="text-lg font-bold">
              확정 상태
            </h2>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-surface-nested p-4">
                <dt className="text-sm text-foreground/70">상태</dt>
                <dd className="mt-1">
                  <Badge tone={data.isClosed ? 'success' : 'warning'}>
                    {data.isClosed ? '확정됨' : '미확정'}
                  </Badge>
                  {data.closedAt && (
                    <span className="mt-1 block text-xs text-foreground/70">
                      확정 일시 {formatDateTime(data.closedAt)}
                    </span>
                  )}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-nested p-4">
                <dt className="text-sm text-foreground/70">하루 기준시간</dt>
                <dd className="mt-1 text-xl font-bold">
                  {data.standardWorkMinutes / 60}시간
                  {data.isClosed && (
                    <span className="block text-xs font-normal text-foreground/70">
                      (확정 당시 값)
                    </span>
                  )}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-nested p-4">
                <dt className="text-sm text-foreground/70">월 기준일수</dt>
                <dd className="mt-1 text-xl font-bold">{data.monthlyWorkDays}일</dd>
              </div>
              <div className="rounded-xl bg-surface-nested p-4">
                <dt className="text-sm text-foreground/70">합계</dt>
                <dd className="mt-1 text-xl font-bold">
                  {value(summary.total).manDays} MD · {value(summary.total).manMonths} MM
                </dd>
              </div>
            </dl>
            {!data.isClosed && (
              <p className="text-sm text-foreground/70">
                확정하면 이 달의 작업 내역는 재오픈하기 전까지 수정할 수 없고, 지금의 기준시간·월
                기준일수가 고정됩니다. 확정은 선택 기능입니다
              </p>
            )}
          </section>

          {data.draftLogCount > 0 && (
            <section
              className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="monthly-drafts-heading"
            >
              <h2 id="monthly-drafts-heading" className="text-lg font-bold">
                임시 저장된 작업 내역 {data.draftLogCount}건
              </h2>
              <p className="text-sm text-foreground/70">
                집계에는 저장된 작업 내역만 반영됩니다. 확정 전에 저장하거나 정리해 주세요
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {data.drafts.map((draft) => (
                  <li key={`${draft.projectId}-${draft.workDate}`}>
                    <Link
                      className="text-primary underline"
                      to={projectWorkPath(draft.projectId, draft.workDate)}
                    >
                      {formatDay(draft.workDate)} · {draft.projectName}
                    </Link>
                  </li>
                ))}
              </ul>
              {data.draftLogCount > data.drafts.length && (
                <p className="text-sm text-foreground/70">
                  앞의 {data.drafts.length}건만 보여 줍니다
                </p>
              )}
            </section>
          )}

          <section
            className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
            aria-labelledby="monthly-table-heading"
          >
            <h2 id="monthly-table-heading" className="text-lg font-bold">
              프로젝트·직원별 공수
            </h2>
            {data.rows.length === 0 ? (
              <p className="text-foreground/70">이 달에 저장된 작업 내역이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-2">프로젝트</th>
                      <th className="py-2 pr-2">직원</th>
                      <th className="py-2 pr-2 text-right">MD</th>
                      <th className="py-2 text-right">MM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr
                        key={`${row.projectId}-${row.employeeId}`}
                        className="border-b border-border"
                      >
                        <td className="py-2 pr-2">
                          {row.projectCode} {row.projectName}
                        </td>
                        <td className="py-2 pr-2">{row.employeeName}</td>
                        <td className="py-2 pr-2 text-right">{value(row.minutes).manDays}</td>
                        <td className="py-2 text-right">{value(row.minutes).manMonths}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {summary.byEmployee.length > 0 && (
            <section
              className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
              aria-labelledby="monthly-employee-heading"
            >
              <h2 id="monthly-employee-heading" className="text-lg font-bold">
                직원별 합계
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {summary.byEmployee.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>{item.name}</span>
                    <span className="font-medium">
                      {value(item.minutes).manDays} MD · {value(item.minutes).manMonths} MM
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5"
            aria-labelledby="monthly-action-heading"
          >
            <h2 id="monthly-action-heading" className="text-lg font-bold">
              {data.isClosed ? '재오픈' : '확정'}
            </h2>
            {!data.isClosed && (
              <>
                {data.draftLogCount > 0 && (
                  <label className="flex min-h-touch items-center gap-3">
                    <Checkbox
                      checked={confirmDrafts}
                      onCheckedChange={(checked) => setConfirmDrafts(checked === true)}
                      aria-label="임시 저장된 작업 내역이 남아 있어도 확정합니다"
                    />
                    <span>
                      임시 저장된 작업 내역 {data.draftLogCount}건이 남아 있어도 확정합니다
                    </span>
                  </label>
                )}
                <Button type="button" disabled={close.isPending || isFuture} onClick={doClose}>
                  {close.isPending ? '확정 중' : `${month} 공수 확정`}
                </Button>
                {isFuture && (
                  <p className="text-sm text-foreground/70">
                    아직 오지 않은 달은 확정할 수 없습니다
                  </p>
                )}
              </>
            )}
            {data.isClosed && (
              <form
                className="flex flex-col gap-3"
                onSubmit={doReopen}
                noValidate
                aria-label="재오픈"
              >
                <FormField
                  label="재오픈 사유 (필수)"
                  error={reasonError}
                  hint="정정이 필요한 이유를 남겨 주세요. 재오픈하면 이 달의 작업 내역을 다시 고칠 수 있습니다"
                >
                  <Textarea
                    maxLength={MONTH_REASON_MAX_LENGTH}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="secondary" disabled={reopen.isPending}>
                  {reopen.isPending ? '처리 중' : `${month} 공수 재오픈`}
                </Button>
              </form>
            )}
          </section>

          <section
            className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
            aria-labelledby="monthly-export-heading"
          >
            <h2 id="monthly-export-heading" className="text-lg font-bold">
              엑셀로 내보내기
            </h2>
            <p className="text-sm text-foreground/70">
              급여·정산 담당에게 전달하는 용도입니다.{' '}
              {data.isClosed
                ? '확정된 값으로 내보냅니다'
                : '아직 확정하지 않아 현재 저장된 기록 기준으로 내보냅니다'}
              . 내보낸 기록은 남습니다
            </p>
            {!isConfirmingExport ? (
              <Button type="button" variant="secondary" onClick={() => setIsConfirmingExport(true)}>
                엑셀로 내보내기
              </Button>
            ) : (
              <div
                className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4"
                role="group"
                aria-label="내보내기 확인"
              >
                <p className="text-sm font-medium">
                  {month} 월 공수표를 내려받습니다. 내보낸 기록이 남습니다
                </p>
                <div className="flex gap-2">
                  <Button type="button" disabled={isExporting} onClick={() => void exportXlsx()}>
                    {isExporting ? '내보내는 중' : '내보내기'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsConfirmingExport(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section
            className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-5"
            aria-labelledby="monthly-history-heading"
          >
            <h2 id="monthly-history-heading" className="text-lg font-bold">
              확정·재오픈 이력
            </h2>
            {data.events.length === 0 ? (
              <p className="text-sm text-foreground/70">확정한 기록이 없습니다</p>
            ) : (
              <ol className="divide-y divide-border">
                {data.events.map((event) => (
                  <li key={event.id} className="flex flex-col gap-0.5 py-2 text-sm">
                    <span className="font-medium">
                      {event.kind === 'CLOSED' ? '확정' : '재오픈'}
                    </span>
                    {event.reason && <span>사유: {event.reason}</span>}
                    <span>
                      기준 {event.standardWorkMinutes / 60}시간 · 월 {event.monthlyWorkDays}일
                      {event.draftLogCount > 0 ? ` · 임시 저장 ${event.draftLogCount}건` : ''}
                    </span>
                    <span className="text-foreground/70">{formatDateTime(event.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
};
