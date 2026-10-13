import { todayInSeoul } from '@field-note/shared';
import { useParams, useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
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
import { MaterialUsageForm } from '../materials/MaterialUsageForm';
import { MaterialUsageList } from '../materials/MaterialUsageList';
import {
  useDeleteMaterialRecord,
  useMaterialBalance,
  useMaterialRecordHistory,
  useMaterials,
} from '../materials/useMaterials';
import { useProject } from '../projects/useProjects';

/**
 * @description 프로젝트 자재: 이 현장에 어떤 자재를 얼마나 썼는지 기록한다 (서비스 기획서 §11)
 * 맞춤 자재가 많은 현장이라 목록에서 고르지 않고 품명·규격을 바로 쓰며, 잔량은 다루지 않는다
 */
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
  const records = history.data?.pages.flatMap((page) => page.items) ?? [];
  const used = (totals.data ?? []).filter((item) => item.used > 0);

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
        <Section
          title="사용한 자재 기록"
          description="이 현장에 쓴 자재를 품명·규격(치수·두께·재질·색)·수량으로 바로 적습니다. 처음 쓰는 자재도 따로 등록할 필요가 없습니다"
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

      <div className="rounded-xl bg-surface-subtle p-4 md:p-5">
        <Section title="자재별 합계" description="이 현장에 쓴 양을 자재마다 모았습니다">
          {totals.isError && <Alert>자재 합계를 불러오지 못했습니다</Alert>}
          {totals.isSuccess && used.length === 0 && (
            <p className="text-sm text-foreground/65">아직 기록한 자재가 없습니다</p>
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
                    <TableCell className="text-foreground/75">{item.spec ?? '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.used.toLocaleString('ko-KR')}
                      <span className="ml-0.5 text-foreground/65">{item.unit}</span>
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
          {history.isPending && <p className="text-sm">불러오는 중</p>}
          {history.isSuccess && records.length === 0 && (
            <EmptyState
              title="아직 기록한 자재가 없습니다"
              description="위에서 쓴 자재를 적어 보세요"
            />
          )}
          {records.length > 0 && (
            <MaterialUsageList
              records={records}
              materials={materials.data ?? []}
              onDelete={(record) => remove.mutate(record.id)}
            />
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
  );
};
