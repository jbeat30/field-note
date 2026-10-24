import { MATERIAL_RECORD_KIND_LABELS, todayInSeoul } from '@field-note/shared';
import { useParams, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { EmptyState } from '../components/ui/empty-state';
import { Section } from '../components/ui/section';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/table';
import { formatDay } from '../lib/dates';
import { LedgerPanel } from '../ledger/LedgerPanel';
import { MaterialUsageForm } from '../materials/MaterialUsageForm';
import {
  useDeleteMaterialRecord,
  useMaterialBalance,
  useMaterialRecordHistory,
  useMaterials,
} from '../materials/useMaterials';
import { useProject } from '../projects/useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

export const ProjectMaterialsPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [params] = useSearchParams();
  const today = todayInSeoul(new Date());
  const requested = params.get('date');
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;
  const materials = useMaterials();
  const totals = useMaterialBalance(id);
  const history = useMaterialRecordHistory(id);
  const remove = useDeleteMaterialRecord();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const records = history.data?.pages.flatMap((page) => page.items) ?? [];
  const used = (totals.data ?? []).filter((item) => item.used > 0);
  const byId = new Map((materials.data ?? []).map((m) => [m.id, m]));

  const handleDelete = async (recordId: string, name: string) => {
    const ok = await confirm({
      title: `${name} 기록을 지울까요?`,
      description: '지우면 되돌릴 수 없습니다',
      confirmLabel: '지우기',
      danger: true,
    });
    if (ok) remove.mutate(recordId);
  };

  if (project.isPending) return <LoadingBlock label="프로젝트를 불러오는 중" variant="page" />;
  if (!project.data) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  return (
    <div className="flex flex-col gap-5">
      {confirmDialog}

      {/* 첫 구역: 지출·수입 (합계 줄 + 내역 표) */}
      <LedgerPanel projectId={id} />

      {/* 자재 등록 폼 전체 폭 */}
      <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
        <Section
          title="자재 등록"
          description="품명·규격·수량을 바로 적습니다. 처음 쓰는 자재도 따로 등록할 필요 없습니다"
        >
          <MaterialUsageForm
            key={date}
            projectId={id}
            defaultDate={date}
            minDate={project.data.plannedStart}
            maxDate={today}
          />
        </Section>
      </div>

      {/* 하단 2열: 합계(좁게) | 날짜별 기록(넓게) */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr]">
        <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
          <Section title="자재별 합계" description="이 현장에 쓴 양을 자재마다 모았습니다">
            {totals.isError && <Alert>자재 합계를 불러오지 못했습니다</Alert>}
            {totals.isSuccess && used.length === 0 && (
              <p className="text-sm text-sub">아직 기록한 자재가 없습니다</p>
            )}
            {used.length > 0 && (
              <Table aria-label="자재별 합계">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>품명</TableHeaderCell>
                    <TableHeaderCell>규격</TableHeaderCell>
                    <TableHeaderCell className="text-right">쓴 양</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {used.map((item) => (
                    <TableRow key={item.materialId}>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell className="text-sub">{item.spec ?? '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.used.toLocaleString('ko-KR')}
                        <span className="ml-0.5 text-sub">{item.unit}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </div>

        <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
          <Section title="날짜별 기록">
            {remove.error && <Alert>지우지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
            {history.isPending && <LoadingBlock label="불러오는 중" variant="rows" lines={6} />}
            {history.isSuccess && records.length === 0 && (
              <EmptyState
                title="아직 기록한 자재가 없습니다"
                description="위에서 쓴 자재를 적어 보세요"
              />
            )}
            {records.length > 0 && (
              <Table aria-label="날짜별 자재 기록">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>날짜</TableHeaderCell>
                    <TableHeaderCell>품명</TableHeaderCell>
                    <TableHeaderCell>규격</TableHeaderCell>
                    <TableHeaderCell>구분</TableHeaderCell>
                    <TableHeaderCell className="text-right">수량</TableHeaderCell>
                    <TableHeaderCell>
                      <span className="sr-only">기록 작업</span>
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => {
                    const material = byId.get(record.materialId);
                    const name = material?.name ?? '(알 수 없는 자재)';

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap text-sm text-sub">
                          {formatDay(record.recordDate)}
                        </TableCell>
                        <TableCell className="font-semibold">{name}</TableCell>
                        <TableCell className="text-sub">{material?.spec ?? '-'}</TableCell>
                        <TableCell className="text-sm text-sub">
                          {record.kind === 'USED' ? '' : MATERIAL_RECORD_KIND_LABELS[record.kind]}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {record.quantity.toLocaleString('ko-KR')}
                          <span className="ml-0.5 text-sm text-sub">{material?.unit}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${name} 기록 지우기`}
                            onClick={() => void handleDelete(record.id, name)}
                          >
                            <span className="text-sub">✕</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {history.hasNextPage && (
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
              >
                {history.isFetchingNextPage ? '불러오는 중' : '더 보기'}
              </Button>
            )}
          </Section>
        </div>
      </div>
      {/* end 하단 2열 */}
    </div>
  );
};
