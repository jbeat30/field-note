import { formatBytes, storageLevel } from '@field-note/shared';

import { Alert } from '../components/ui/alert';
import { ProgressBar } from '../components/ui/progress-bar';

import { useStorageUsage } from './useCompanyData';

const PURPOSE_LABELS = { PHOTO: '사진', DOCUMENT: '문서', EMPLOYEE_DOCUMENT: '직원 서류' } as const;

const TOP_PROJECTS = 5;

// 회사 관리의 저장 용량: 한도 대비 사용량, 용도별·프로젝트별 사용량, 80% 이상이면 정리 안내
export const StorageSection = () => {
  const usage = useStorageUsage();

  if (usage.isError) {
    return <Alert>저장 용량을 불러오지 못했습니다</Alert>;
  }

  if (!usage.data) {
    return <p className="text-sm">불러오는 중</p>;
  }

  const { quotaBytes, usedBytes, byPurpose, byProject } = usage.data;
  const percent = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 100;
  const level = storageLevel(usedBytes, quotaBytes);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        <span className="text-lg font-bold tabular-nums">{formatBytes(usedBytes)}</span>
        <span className="text-foreground/70">
          {' '}
          / {formatBytes(quotaBytes)} 사용 ({percent}%)
        </span>
      </p>
      <ProgressBar aria-label="저장 용량 사용률" value={percent} />
      {level === 'WARN' && (
        <Alert variant="info">
          저장 용량이 80%를 넘었습니다. 오래된 프로젝트의 사진·문서를 정리하거나 운영자에게 한도
          조정을 요청해 주세요
        </Alert>
      )}
      {level === 'FULL' && (
        <Alert>
          저장 용량이 가득 차서 새 사진·문서를 올릴 수 없습니다. 파일을 정리하거나 운영자에게 한도
          조정을 요청해 주세요
        </Alert>
      )}
      {byPurpose.length > 0 && (
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
          {byPurpose.map((row) => (
            <div key={row.purpose} className="contents">
              <dt className="text-foreground/70">{PURPOSE_LABELS[row.purpose]}</dt>
              <dd className="tabular-nums">
                {formatBytes(row.bytes)} · {row.count}개
              </dd>
            </div>
          ))}
        </dl>
      )}
      {byProject.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">프로젝트별 (큰 순)</h3>
          <ul className="flex flex-col gap-0.5 text-sm">
            {byProject.slice(0, TOP_PROJECTS).map((row) => (
              <li key={row.projectId ?? 'employee'} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums text-foreground/70">
                  {formatBytes(row.bytes)} · {row.count}개
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
