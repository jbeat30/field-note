import {
  CHANGE_WORK_STATUS_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  PHOTO_CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  reportWorkUnitLabel,
  reportWorkValue,
  toManMonths,
  type ProjectCompletionSummary,
} from '@field-note/shared';

import { formatDay } from '../lib/dates';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5 break-inside-avoid" aria-label={title}>
    <h2 className="border-b border-foreground pb-0.5 text-base font-bold">{title}</h2>
    {children}
  </section>
);

const th = 'border border-border bg-muted px-2 py-1 text-left text-sm font-medium';
const td = 'border border-border px-2 py-1 text-sm align-top';

// 프로젝트 요약 한 장 (완료 리포트, 서비스 기획서 §10.7): 화면에서는 그대로 보고 인쇄·PDF로 저장한다.
// 금액과 민감 문서는 싣지 않고 기간·공수·자재·변경 작업·사진·자료 같은 사실 기록만 모은다
export const ProjectSummarySheet = ({ summary }: { summary: ProjectCompletionSummary }) => {
  const { project, work, materials, changeWorks, afterService, photos, documents, settings } =
    summary;
  const unit = reportWorkUnitLabel(settings.workUnitMode);
  const value = (minutes: number) => reportWorkValue(minutes, settings);
  const manDays = (minutes: number) => minutes / settings.standardWorkMinutes;
  // 고객에게 내는 준공 요약이라 반입·반출·폐기·잔량은 싣지 않고 쓴 자재만 보인다
  const usedMaterials = materials.filter((item) => item.used > 0);
  const burn =
    work.plannedMinutes && work.plannedMinutes > 0
      ? Math.round((work.totalMinutes / work.plannedMinutes) * 100)
      : null;

  return (
    <article className="flex flex-col gap-4 text-foreground" aria-label="프로젝트 요약">
      <header className="flex flex-col gap-1 border-b-2 border-foreground pb-2">
        <p className="text-sm text-foreground/70">{summary.companyName}</p>
        <h1 className="text-2xl font-bold">프로젝트 요약</h1>
        <p className="text-sm text-foreground/70">
          {summary.generatedOn} 기준 기록으로 만든 요약입니다
        </p>
      </header>

      <Section title="기본정보">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-foreground/70">프로젝트</dt>
          <dd>
            {project.code} {project.name} ({PROJECT_STATUS_LABELS[project.status]})
          </dd>
          <dt className="text-foreground/70">현장</dt>
          <dd>
            {project.siteName}
            {project.siteAddress ? ` (${project.siteAddress})` : ''}
          </dd>
          <dt className="text-foreground/70">고객</dt>
          <dd>{project.clientName}</dd>
          <dt className="text-foreground/70">담당자</dt>
          <dd>{project.managerName}</dd>
          <dt className="text-foreground/70">계약일</dt>
          <dd>{formatDay(project.contractDate)}</dd>
          <dt className="text-foreground/70">예정 기간</dt>
          <dd>
            {project.plannedStart} ~ {project.plannedEnd}
          </dd>
          <dt className="text-foreground/70">실제 기간</dt>
          <dd>
            {project.actualStart ?? '시작 전'} ~ {project.actualEnd ?? '진행 중'}
          </dd>
          <dt className="text-foreground/70">진행률</dt>
          <dd>{summary.progressPercent === null ? '기록 없음' : `${summary.progressPercent}%`}</dd>
        </dl>
      </Section>

      <Section title="투입 요약">
        <p className="text-sm">
          총{' '}
          {settings.workUnitMode === 'HOURS'
            ? `${value(work.totalMinutes)} ${unit} (${manDays(work.totalMinutes).toFixed(1)} MD · ${toManMonths(manDays(work.totalMinutes), settings.monthlyWorkDays).toFixed(2)} MM)`
            : `${manDays(work.totalMinutes).toFixed(1)} MD · ${toManMonths(manDays(work.totalMinutes), settings.monthlyWorkDays).toFixed(2)} MM`}{' '}
          · 작업일 {work.workedDays}일 · 저장된 작업 내역 {work.savedLogCount}건
          {work.plannedMinutes !== null
            ? ` · 계획 ${value(work.plannedMinutes)} ${unit}${burn !== null ? ` 대비 ${burn}%` : ''}`
            : ' · 계획 공수 없음'}
        </p>
        {work.byEmployee.length === 0 ? (
          <p className="text-sm text-foreground/70">저장된 공수가 없습니다</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <table className="w-full border-collapse">
              <caption className="pb-1 text-left text-sm font-medium">인원별</caption>
              <thead>
                <tr>
                  <th className={th}>이름</th>
                  <th className={th}>작업일</th>
                  <th className={th}>공수 ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {work.byEmployee.map((row) => (
                  <tr key={row.employeeId}>
                    <td className={td}>{row.name}</td>
                    <td className={td}>{row.workedDays}일</td>
                    <td className={td}>{value(row.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full border-collapse">
              <caption className="pb-1 text-left text-sm font-medium">작업 구분별</caption>
              <thead>
                <tr>
                  <th className={th}>구분</th>
                  <th className={th}>공수 ({unit})</th>
                </tr>
              </thead>
              <tbody>
                {work.byCategory.map((row) => (
                  <tr key={row.categoryName}>
                    <td className={td}>{row.categoryName}</td>
                    <td className={td}>{value(row.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="자재 요약">
        {usedMaterials.length === 0 ? (
          <p className="text-sm text-foreground/70">사용한 자재가 없습니다</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>품명</th>
                <th className={th}>규격</th>
                <th className={th}>쓴 양</th>
              </tr>
            </thead>
            <tbody>
              {usedMaterials.map((item) => (
                <tr key={item.materialId}>
                  <td className={td}>{item.name}</td>
                  <td className={td}>{item.spec ?? '-'}</td>
                  <td className={td}>
                    {item.used} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="변경·추가 작업">
        {changeWorks.items.length === 0 ? (
          <p className="text-sm text-foreground/70">기록이 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {changeWorks.items.map((item) => (
              <li key={item.seq}>
                #{item.seq} · {CHANGE_WORK_STATUS_LABELS[item.status]} ·{' '}
                {formatDay(item.requestedOn)} {item.requester} — {item.content}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm">
          변경·추가 작업으로 표시한 작업 내역 {changeWorks.workLogCount}건 · 공수{' '}
          {value(changeWorks.minutes)} {unit}
        </p>
      </Section>

      <Section title="사후 작업">
        <p className="text-sm">
          사후 작업으로 표시한 작업 내역 {afterService.workLogCount}건 · 공수{' '}
          {value(afterService.minutes)} {unit} (보수 요청 기록은 이후 단계에서 추가됩니다)
        </p>
      </Section>

      <Section title="사진">
        {photos.items.length === 0 ? (
          <p className="text-sm text-foreground/70">사진이 없습니다</p>
        ) : (
          <>
            <p className="text-sm">
              전체 {photos.total}장 중 {photos.items.length}장 (직접 고른 사진, 고르지 않았으면 작업
              후 사진 최근 8장)
            </p>
            <ul className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-6">
              {photos.items.map((photo) => (
                <li key={photo.id} className="break-inside-avoid text-xs">
                  {photo.thumbnailUrl ? (
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.description ?? `${PHOTO_CATEGORY_LABELS[photo.category]} 사진`}
                      className="aspect-square w-full rounded object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full rounded bg-muted" />
                  )}
                  <p>
                    {PHOTO_CATEGORY_LABELS[photo.category]}
                    {photo.area ? ` · ${photo.area}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="작업자료">
        <p className="text-sm text-foreground/70">
          안전·검사, 계약·공문 분류 중 요약에 넣기로 고른 문서입니다 (고르지 않았으면 해당 분류의
          민감하지 않은 문서 전체)
        </p>
        {documents.items.length === 0 ? (
          <p className="text-sm text-foreground/70">공개할 자료가 없습니다</p>
        ) : (
          <ul className="flex flex-col gap-0.5 text-sm">
            {documents.items.map((item) => (
              <li key={item.id}>
                {item.title} · {DOCUMENT_CATEGORY_LABELS[item.category]} · {item.versionCount}개
                버전 (최신 개정 {item.latestRevisionDate})
              </li>
            ))}
          </ul>
        )}
        {documents.sensitiveExcluded > 0 && (
          <p className="text-sm text-foreground/70">
            민감 자료 {documents.sensitiveExcluded}건은 요약에 싣지 않았습니다
          </p>
        )}
      </Section>
    </article>
  );
};
