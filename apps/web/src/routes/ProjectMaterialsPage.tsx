import {
  MATERIAL_RECORD_KINDS,
  MATERIAL_RECORD_KIND_LABELS,
  type MaterialRecordKind,
} from '@field-note/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { MaterialBalanceTable } from '../materials/MaterialBalanceTable';
import { MaterialRecordList } from '../materials/MaterialRecordList';
import {
  useDeleteMaterialRecord,
  useMaterialBalance,
  useMaterialRecordHistory,
  useMaterials,
  useUpdateMaterialRecord,
} from '../materials/useMaterials';
import { useProject } from '../projects/useProjects';

// 프로젝트별 자재 현황: 자재마다 반입·사용·반출·폐기와 잔량, 그리고 날짜별 기록 (서비스 기획서 §11.4, §11.7)
export const ProjectMaterialsPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const balance = useMaterialBalance(id);
  const materials = useMaterials();
  const [kind, setKind] = useState<MaterialRecordKind | ''>('');
  const history = useMaterialRecordHistory(id, { kind: kind || undefined });
  const update = useUpdateMaterialRecord();
  const remove = useDeleteMaterialRecord();
  const records = history.data?.pages.flatMap((page) => page.items) ?? [];

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        className="min-h-touch content-center text-sm text-primary underline"
        to={`/projects/${id}`}
      >
        ← {project.data.name}
      </Link>
      <h1 className="text-2xl font-bold">자재 현황</h1>
      <Link
        className="min-h-touch content-center text-primary underline"
        to={`/work-logs?project=${id}`}
      >
        일지에서 자재 입력하기
      </Link>
      <section className="flex flex-col gap-2" aria-labelledby="balance-heading">
        <h2 id="balance-heading" className="text-lg font-bold">
          잔량
        </h2>
        {balance.isPending && <p className="text-sm">불러오는 중</p>}
        {balance.isError && <Alert>자재 현황을 불러오지 못했습니다</Alert>}
        {balance.isSuccess && <MaterialBalanceTable items={balance.data} />}
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="records-heading">
        <h2 id="records-heading" className="text-lg font-bold">
          기록
        </h2>
        <Select
          className="w-auto"
          aria-label="구분으로 거르기"
          value={kind}
          onChange={(event) => setKind(event.target.value as MaterialRecordKind | '')}
        >
          <option value="">모든 구분</option>
          {MATERIAL_RECORD_KINDS.map((value) => (
            <option key={value} value={value}>
              {MATERIAL_RECORD_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
        {(update.error ?? remove.error) && (
          <Alert>처리하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>
        )}
        {history.isPending && <p className="text-sm">불러오는 중</p>}
        {history.isSuccess && records.length === 0 && (
          <p className="text-sm text-foreground/70">기록이 없습니다</p>
        )}
        {records.length > 0 && (
          <MaterialRecordList
            showDates
            records={records}
            materials={materials.data ?? []}
            onChangeQuantity={(record, quantity) =>
              update.mutate({ id: record.id, body: { quantity } })
            }
            onDelete={(record) => remove.mutate(record.id)}
          />
        )}
        {history.hasNextPage && (
          <Button
            type="button"
            variant="secondary"
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? '불러오는 중' : '더 보기'}
          </Button>
        )}
      </section>
    </div>
  );
};
