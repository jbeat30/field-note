import {
  MATERIAL_RECORD_KIND_LABELS,
  PHOTO_CATEGORY_LABELS,
  WORK_LOG_STATUS_LABELS,
  reportWorkUnitLabel,
  reportWorkValue,
  type DailyReport,
} from '@field-note/shared';

import { formatDay } from '../lib/dates';

type ReportSheetProps = {
  report: DailyReport;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5 break-inside-avoid" aria-label={title}>
    <h2 className="border-b border-foreground pb-0.5 text-base font-bold">{title}</h2>
    {children}
  </section>
);

const th = 'border border-border bg-muted px-2 py-1 text-left text-sm font-medium';
const td = 'border border-border px-2 py-1 text-sm align-top';

// 작업일보 한 장: 화면에서는 그대로 보고, 인쇄하면 A4 한 장 분량으로 나온다 (고객 제출용, 서비스 기획서 §15.4)
// 금액은 다루지 않고 작업 내용·인원·공수·자재·사진 같은 사실 기록만 싣는다
export const ReportSheet = ({ report }: ReportSheetProps) => {
  const { project, workLog, entries, totals, settings, materials, photos } = report;
  const unit = reportWorkUnitLabel(settings.workUnitMode);
  const value = (minutes: number) => reportWorkValue(minutes, settings);

  return (
    <article className="flex flex-col gap-4 text-foreground" aria-label="작업일보">
      <header className="flex flex-col gap-1 border-b-2 border-foreground pb-2">
        <p className="text-sm text-foreground/70">{report.companyName}</p>
        <h1 className="text-2xl font-bold">작업일보</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-foreground/70">일자</dt>
          <dd>
            {formatDay(report.date)} ({report.date})
          </dd>
          <dt className="text-foreground/70">프로젝트</dt>
          <dd>
            {project.code} {project.name}
          </dd>
          <dt className="text-foreground/70">현장</dt>
          <dd>
            {project.siteName}
            {project.siteAddress ? ` (${project.siteAddress})` : ''}
          </dd>
          {project.clientName && (
            <>
              <dt className="text-foreground/70">고객</dt>
              <dd>{project.clientName}</dd>
            </>
          )}
        </dl>
      </header>

      <Section title="작업 내용">
        {workLog ? (
          <>
            <p className="whitespace-pre-wrap text-base">{workLog.content || '(작업 내용 없음)'}</p>
            {(workLog.area || workLog.isChange || workLog.isAfterService) && (
              <p className="text-sm text-foreground/80">
                {[
                  workLog.area && `구역: ${workLog.area}`,
                  workLog.isChange && '변경·추가 작업 포함',
                  workLog.isAfterService && '사후 작업',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {workLog.notes && (
              <p className="whitespace-pre-wrap text-sm">특이사항: {workLog.notes}</p>
            )}
            {workLog.status === 'DRAFT' && (
              <p className="text-sm text-danger">
                {WORK_LOG_STATUS_LABELS.DRAFT} 상태의 일지입니다 (아직 확정되지 않음)
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground/70">이 날 작성한 일지가 없습니다</p>
        )}
      </Section>

      <Section title="투입 인원·공수">
        {entries.length === 0 ? (
          <p className="text-sm text-foreground/70">기록된 공수가 없습니다</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>직원</th>
                <th className={th}>직종</th>
                <th className={th}>작업 구분</th>
                <th className={`${th} text-right`}>공수({unit})</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.employeeId}:${index}`} className="break-inside-avoid">
                  <td className={td}>{entry.employeeName}</td>
                  <td className={td}>{entry.jobTypeName ?? ''}</td>
                  <td className={td}>{entry.categoryName}</td>
                  <td className={`${td} text-right`}>{value(entry.minutes)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={`${td} font-bold`} colSpan={3}>
                  합계 ({totals.headcount}명)
                </td>
                <td className={`${td} text-right font-bold`}>{value(totals.minutes)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Section>

      <Section title="자재">
        {materials.length === 0 ? (
          <p className="text-sm text-foreground/70">기록된 자재가 없습니다</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>자재</th>
                <th className={th}>구분</th>
                <th className={`${th} text-right`}>수량</th>
                <th className={th}>비고</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => (
                <tr key={index} className="break-inside-avoid">
                  <td className={td}>
                    {material.materialName}
                    {material.spec ? ` ${material.spec}` : ''}
                  </td>
                  <td className={td}>{MATERIAL_RECORD_KIND_LABELS[material.kind]}</td>
                  <td className={`${td} text-right`}>
                    {material.quantity}
                    {material.unit}
                  </td>
                  <td className={td}>
                    {[
                      material.categoryName,
                      material.area,
                      material.isChange && '변경·추가',
                      material.isAfterService && '사후',
                      material.memo,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="사진">
        {photos.length === 0 ? (
          <p className="text-sm text-foreground/70">이 날 올린 사진이 없습니다</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id} className="flex flex-col gap-1 break-inside-avoid">
                {photo.thumbnailUrl ? (
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.description ?? '작업 사진'}
                    className="aspect-[4/3] w-full rounded border border-border object-cover"
                  />
                ) : (
                  <span className="flex aspect-[4/3] items-center justify-center rounded border border-dashed border-border text-xs text-foreground/70">
                    사진 처리 중
                  </span>
                )}
                <span className="text-xs">
                  {PHOTO_CATEGORY_LABELS[photo.category]}
                  {photo.area ? ` · ${photo.area}` : ''}
                  {photo.description ? ` — ${photo.description}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        {report.hasMorePhotos && (
          <p className="text-xs text-foreground/70">
            사진이 많아 일부만 실었습니다. 전체는 사진첩에서 확인하세요
          </p>
        )}
      </Section>
    </article>
  );
};
