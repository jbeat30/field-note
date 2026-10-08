import { getErrorDetailMessage } from '../lib/apiError';

export class ReportExportError extends Error {}

/**
 * @description 응답의 Content-Disposition 헤더에서 파일 이름을 읽음 (한글 이름을 위한 `filename*=UTF-8''...` 형식)
 * @param disposition 헤더 값
 * @param fallback 읽을 수 없을 때 쓸 이름
 * @returns 파일 이름
 */
export const filenameFromDisposition = (disposition: string | null, fallback: string) => {
  const match = disposition?.match(/filename\*=UTF-8''([^;]+)/i);

  if (!match) return fallback;

  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return fallback;
  }
};

/**
 * @description 기간 안의 작업일보를 엑셀로 내려받음. 내보내기는 서버에 기록으로 남는다. 오류는 파일 대신 JSON으로 오므로 화면이 바뀌지 않게 직접 받아 처리한다
 * @param projectId 프로젝트 ID
 * @param from 시작 날짜
 * @param to 끝 날짜
 * @returns 내려받은 파일 이름
 * @throws 기간이 잘못됐거나 서버 오류일 때 사유와 함께
 */
export const downloadReportXlsx = async (projectId: string, from: string, to: string) => {
  let response: Response;

  try {
    response = await fetch(
      `/api/v1/projects/${projectId}/daily-reports.xlsx?${new URLSearchParams({ from, to })}`,
      { credentials: 'same-origin' },
    );
  } catch {
    throw new ReportExportError('연결이 끊겼습니다. 연결을 확인하고 다시 시도해 주세요');
  }

  if (!response.ok) {
    throw new ReportExportError(getErrorDetailMessage(await response.json().catch(() => null)));
  }

  const filename = filenameFromDisposition(
    response.headers.get('Content-Disposition'),
    `작업일보_${from}_${to}.xlsx`,
  );
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // 내려받기가 시작된 뒤에 주소를 풀어 줌
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return filename;
};

/**
 * @description 사진이 모두 불러와진 뒤에 인쇄 창을 엶 (사진이 빠진 채 인쇄·PDF 저장되지 않게). 5초 안에 못 불러오면 그대로 연다
 */
export const printWhenReady = async () => {
  const pending = [...document.images].filter((image) => !image.complete);

  await Promise.race([
    Promise.all(
      pending.map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    ),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);

  window.print();
};
