import { Alert } from '../components/ui/alert';

import { MaterialEntryForm } from './MaterialEntryForm';
import { MaterialRecordList } from './MaterialRecordList';
import {
  useCreateMaterial,
  useCreateMaterialRecords,
  useDeleteMaterialRecord,
  useMaterialRecordHistory,
  useMaterialRecordsOnDate,
  useMaterials,
  useUpdateMaterialRecord,
} from './useMaterials';

type MaterialDayPanelProps = {
  projectId: string;
  date: string;
  categories: readonly { id: string; name: string }[];
};

// 작업일지 화면 안의 자재 입력 (별도 메뉴로 가지 않음): 그날 기록을 보고, 목록으로 여러 자재를 한꺼번에 추가한다
export const MaterialDayPanel = ({ projectId, date, categories }: MaterialDayPanelProps) => {
  const materials = useMaterials();
  const records = useMaterialRecordsOnDate(projectId, date);
  const history = useMaterialRecordHistory(projectId);
  const createRecords = useCreateMaterialRecords(projectId);
  const createMaterial = useCreateMaterial();
  const update = useUpdateMaterialRecord();
  const remove = useDeleteMaterialRecord();
  const list = materials.data ?? [];

  // "어제와 동일"의 기준: 이 날짜보다 앞선 가장 최근 기록일의 기록 (최근 기록 첫 페이지 안에서 찾음)
  const earlier = (history.data?.pages[0]?.items ?? []).filter(
    (record) => record.recordDate < date,
  );
  const previousDate = earlier
    .map((record) => record.recordDate)
    .sort()
    .at(-1);
  const previousRecords = earlier.filter((record) => record.recordDate === previousDate);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="materials-heading">
      <h2 id="materials-heading" className="text-lg font-bold">
        자재
      </h2>
      {materials.isError && <Alert>자재 목록을 불러오지 못했습니다</Alert>}
      {records.isSuccess && records.data.length > 0 && (
        <MaterialRecordList
          records={records.data}
          materials={list}
          onChangeQuantity={(record, quantity) =>
            update.mutate({ id: record.id, body: { quantity } })
          }
          onDelete={(record) => remove.mutate(record.id)}
        />
      )}
      {records.isSuccess && records.data.length === 0 && (
        <p className="text-sm text-foreground/70">이 날 기록한 자재가 없습니다</p>
      )}
      {(update.error ?? remove.error) && (
        <Alert>처리하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>
      )}
      {materials.isSuccess && (
        <MaterialEntryForm
          date={date}
          materials={list}
          categories={categories}
          previousRecords={previousRecords}
          onSubmit={async (items) => void (await createRecords.mutateAsync({ records: items }))}
          onCreateMaterial={(input) => createMaterial.mutateAsync(input)}
        />
      )}
    </section>
  );
};
