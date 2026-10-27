import { PHOTO_CATEGORY_LABELS, minutesToManDays, roundTo } from '@field-note/shared';
import { Link } from 'react-router';

import { Badge } from '../components/ui/badge';
import { useEmployees } from '../employees/useEmployees';
import { projectWorkPath } from '../lib/projectPaths';
import { usePhotoList } from '../photos/usePhotos';
import { useCompanySettings } from '../settings/useCompanySettings';
import { useWorkLogList } from '../workLogs/useWorkLogs';

// 현황 탭의 최근 항목 개수
const RECENT_LOGS = 4;
const RECENT_PHOTOS = 3;

const cardClass = 'flex flex-col gap-4 rounded-[30px] bg-surface-subtle p-7';
const titleClass = 'text-[22px] font-extrabold';
const linkClass =
  'border-b-2 border-accent text-sm font-bold hover:text-sub focus-visible:outline-2 focus-visible:outline-offset-2';

// "10.23"
const shortDate = (date: string) => date.slice(5).replace('-', '.');

// 최근 작업일지: 날짜, 일한 사람, 저장 상태, 공수(MD)
export const RecentWorkLogsPanel = ({ projectId }: { projectId: string }) => {
  const logs = useWorkLogList(projectId);
  const employees = useEmployees({});
  const settings = useCompanySettings();
  const names = new Map((employees.data ?? []).map((item) => [item.id, item.name]));
  const recent = [...(logs.data ?? [])]
    .sort((a, b) => b.workDate.localeCompare(a.workDate))
    .slice(0, RECENT_LOGS);

  return (
    <section className={cardClass} aria-labelledby="recent-logs-heading">
      <div className="flex items-center justify-between">
        <h2 id="recent-logs-heading" className={titleClass}>
          최근 작업일지
        </h2>
        <Link to={projectWorkPath(projectId)} className={linkClass}>
          전체 보기
        </Link>
      </div>
      {logs.isError && <p className="text-sm text-sub">작업일지를 불러오지 못했습니다</p>}
      {logs.data && recent.length === 0 && (
        <p className="text-sm text-sub">아직 쓴 작업일지가 없습니다</p>
      )}
      <ul className="flex flex-col gap-3">
        {recent.map((log) => {
          const first = names.get(log.workers[0]?.employeeId ?? '');

          return (
            <li key={log.id}>
              <Link
                to={projectWorkPath(projectId, log.workDate)}
                className="flex items-center gap-3.5 rounded-[18px] bg-surface-nested px-4 py-3 hover:opacity-85"
              >
                <span className="w-16 font-emphasis font-bold">{shortDate(log.workDate)}</span>
                <span className="min-w-0 flex-1 text-[15px] font-bold">
                  {first
                    ? log.workers.length > 1
                      ? `${first} 외 ${log.workers.length - 1}명`
                      : first
                    : '작업 내역'}
                </span>
                <Badge tone={log.status === 'SAVED' ? 'success' : 'warning'}>
                  {log.status === 'SAVED' ? '저장됨' : '임시 저장'}
                </Badge>
                <span className="w-20 text-right font-emphasis font-bold">
                  {roundTo(
                    minutesToManDays(log.totalMinutes, settings.data?.standardWorkMinutes ?? 480),
                    1,
                  ).toFixed(1)}{' '}
                  MD
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

// 현장 사진: 최근 사진 3장과 구분 표시, 사진첩으로 이동
export const RecentPhotosPanel = ({ projectId }: { projectId: string }) => {
  const photos = usePhotoList(projectId, {}, RECENT_PHOTOS);
  const items = (photos.data?.pages[0]?.items ?? []).slice(0, RECENT_PHOTOS);

  return (
    <section className={cardClass} aria-labelledby="recent-photos-heading">
      <div className="flex items-center justify-between">
        <h2 id="recent-photos-heading" className={titleClass}>
          현장 사진
        </h2>
        <Link to={`/projects/${projectId}/photos`} className={linkClass}>
          사진첩
        </Link>
      </div>
      {photos.isError && <p className="text-sm text-sub">사진을 불러오지 못했습니다</p>}
      {photos.data && items.length === 0 && (
        <p className="text-sm text-sub">등록한 사진이 없습니다</p>
      )}
      <ul className="grid grid-cols-3 gap-2.5">
        {items.map((photo) => (
          <li key={photo.id} className="relative h-32 overflow-hidden rounded-[18px] bg-field">
            {photo.thumbnailUrl && (
              <img
                src={photo.thumbnailUrl}
                alt={photo.description ?? `${PHOTO_CATEGORY_LABELS[photo.category]} 사진`}
                loading="lazy"
                className="size-full object-cover"
              />
            )}
            <span className="absolute bottom-2 left-2 rounded-full bg-surface px-2.5 py-0.5 text-[12.5px] font-bold">
              {PHOTO_CATEGORY_LABELS[photo.category]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
