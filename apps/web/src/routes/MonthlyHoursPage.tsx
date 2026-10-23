import {
  MONTH_REASON_MAX_LENGTH,
  monthOf,
  monthlyReopenSchema,
  monthlyWorkValue,
  summarizeMonthlyHours,
  todayInSeoul,
  WORK_PATTERNS,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button, pillButtonClass } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/ui/form-field';
import { PeriodNav } from '../components/ui/period-nav';
import { StatGroup } from '../components/ui/stat-group';
import { Textarea } from '../components/ui/textarea';
import { useConfirm } from '../components/ui/confirm-dialog';
import { formatDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { splitServerErrors } from '../lib/serverErrors';
import { MonthlyMatrixTable } from '../monthly/MonthlyMatrixTable';
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
  const { confirm, dialog: confirmDialog } = useConfirm();

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
    const ok = await confirm({
      title: `${month} 공수표를 내보낼까요?`,
      description: '내보낸 기록이 남습니다',
      confirmLabel: '내보내기',
    });
    if (!ok) return;

    setIsExporting(true);
    setRootError('');
    setMessage('');

    try {
      setMessage(`${await downloadMonthlyXlsx(month)} 파일을 내려받았습니다`);
    } catch (caught) {
      setRootError(caught instanceof ReportExportError ? caught.message : '내보내지 못했습니다');
    } finally {
      setIsExporting(false);
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
    <div className="flex flex-col gap-5">
      {confirmDialog}
      <PageHeader
        title="월 공수표"
        description="한 달 공수를 확인하고 확정합니다"
        back={<BackLink to="/employees">직원</BackLink>}
        eyebrow={
          data && (
            <Badge tone={data.isClosed ? 'success' : 'warning'}>
              {data.isClosed ? '확정됨' : '미확정'}
            </Badge>
          )
        }
        actions={
          data && (
            <>
              <button
                type="button"
                className={pillButtonClass}
                disabled={isExporting}
                onClick={() => void exportXlsx()}
              >
                {isExporting ? '내보내는 중' : '엑셀로 내보내기'}
              </button>
              {!data.isClosed && (
                <Button
                  type="button"
                  className="h-[50px] rounded-full px-5"
                  disabled={close.isPending || isFuture}
                  onClick={doClose}
                >
                  {close.isPending ? '확정 중' : '공수 확정'}
                </Button>
              )}
            </>
          )
        }
      />

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
      {message && (
        <p role="status" className="text-sm font-medium text-success">
          {message}
        </p>
      )}
      {!data && <p className="text-sm">불러오는 중</p>}

      {data && summary && (
        <>
          {/* 수치 요약 */}
          <div>
            <StatGroup
              items={[
                {
                  label: '합계',
                  value: `${value(summary.total).manDays} MD`,
                  hint: `${value(summary.total).manMonths} MM`,
                },
                { label: '일한 사람', value: summary.byEmployee.length, unit: '명' },
                { label: '프로젝트', value: summary.byProject.length, unit: '개' },
                { label: '하루 기준시간', value: `${data.standardWorkMinutes / 60}`, unit: '시간' },
                {
                  label: 'MM 환산 기준',
                  value: data.monthlyWorkDays,
                  unit: '일',
                  hint: `1MM = ${data.monthlyWorkDays}MD (${WORK_PATTERNS.find((item) => item.days === data.monthlyWorkDays)?.label ?? '직접 입력'}${WORK_PATTERNS.some((item) => item.days === data.monthlyWorkDays) ? ' 연평균' : ''})`,
                },
              ]}
            />
            {data.isClosed && data.closedAt && (
              <p className="mt-2 text-xs text-foreground/65">
                확정 {formatDateTime(data.closedAt)}
              </p>
            )}
          </div>

          {/* xl+ 2열: 왼쪽 표 / 오른쪽 확정+이력 */}
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_300px]">
            {/* 왼쪽: 임시저장 경고 + 표 + 직원별 합계 */}
            <div className="flex flex-col gap-4">
              {data.draftLogCount > 0 && (
                <section
                  className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4"
                  aria-labelledby="monthly-drafts-heading"
                >
                  <h2 id="monthly-drafts-heading" className="text-base font-semibold">
                    임시 저장된 작업 내역 {data.draftLogCount}건
                  </h2>
                  <p className="text-sm text-foreground/70">확정 전에 저장하거나 정리해 주세요</p>
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
                  {data.draftLogCount > 0 && !data.isClosed && (
                    <label className="flex min-h-touch items-center gap-3 text-sm">
                      <Checkbox
                        checked={confirmDrafts}
                        onCheckedChange={(checked) => setConfirmDrafts(checked === true)}
                        aria-label="임시 저장된 작업 내역이 남아 있어도 확정합니다"
                      />
                      <span>임시 저장 {data.draftLogCount}건이 남아 있어도 확정합니다</span>
                    </label>
                  )}
                </section>
              )}

              <section
                className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
                aria-labelledby="monthly-table-heading"
              >
                <h2 id="monthly-table-heading" className="text-base font-semibold">
                  직원 × 프로젝트 공수
                </h2>
                <MonthlyMatrixTable rows={data.rows} settings={settings!} />
              </section>
            </div>

            {/* 오른쪽: 확정/재오픈 + 이력 */}
            <div className="flex flex-col gap-4">
              <section
                className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-4"
                aria-labelledby="monthly-action-heading"
              >
                <h2 id="monthly-action-heading" className="text-base font-semibold">
                  {data.isClosed ? '재오픈' : '확정'}
                </h2>
                {!data.isClosed && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-foreground/70">
                      확정하면 이 달의 작업 내역을 재오픈 전까지 수정할 수 없고 기준시간·일수가
                      고정됩니다. 확정은 선택 기능입니다
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="self-start"
                      disabled={close.isPending || isFuture}
                      onClick={doClose}
                    >
                      {close.isPending ? '확정 중' : `${month} 공수 확정`}
                    </Button>
                    {isFuture && (
                      <p className="text-sm text-foreground/70">
                        아직 오지 않은 달은 확정할 수 없습니다
                      </p>
                    )}
                  </div>
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
                      hint="재오픈하면 이 달의 작업 내역을 다시 고칠 수 있습니다"
                    >
                      <Textarea
                        maxLength={MONTH_REASON_MAX_LENGTH}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </FormField>
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      className="self-start"
                      disabled={reopen.isPending}
                    >
                      {reopen.isPending ? '처리 중' : `${month} 공수 재오픈`}
                    </Button>
                  </form>
                )}
              </section>

              <section
                className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4"
                aria-labelledby="monthly-history-heading"
              >
                <h2 id="monthly-history-heading" className="text-base font-semibold">
                  확정·재오픈 이력
                </h2>
                {data.events.length === 0 ? (
                  <p className="text-sm text-foreground/70">확정한 기록이 없습니다</p>
                ) : (
                  <ol className="divide-y divide-line text-sm">
                    {data.events.map((event) => (
                      <li key={event.id} className="flex flex-col gap-0.5 py-2">
                        <span className="font-semibold">
                          {event.kind === 'CLOSED' ? '확정' : '재오픈'}
                        </span>
                        {event.reason && (
                          <span className="text-foreground/70">사유: {event.reason}</span>
                        )}
                        <span className="text-foreground/65">
                          {event.standardWorkMinutes / 60}시간 · {event.monthlyWorkDays}일
                          {event.draftLogCount > 0 ? ` · 임시 ${event.draftLogCount}건` : ''}
                        </span>
                        <span className="text-xs text-foreground/70">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
