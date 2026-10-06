import type { JobQueue } from '../queue/jobQueue';

import { buildSecurityNoticeEmail, type SecurityNoticeKind } from './accountEmails';
import type { Mailer } from './mailer';

export const SECURITY_NOTICE_QUEUE = 'security-notice.send';

// 알림은 받는 주소가 필요해 큐 작업에 담김 (큐 계정은 업무 테이블을 읽을 수 없어 처리기가 주소를 조회할 수 없음)
// 코드·토큰 같은 비밀 값은 담지 않으며, 완료된 작업은 큐의 보관 기간이 지나면 삭제됨
type SecurityNoticeJob = { kind: SecurityNoticeKind; to: string; hint?: string };

export type SecurityNotifier = {
  notify: (kind: SecurityNoticeKind, to: string, hint?: string) => Promise<void>;
};

/**
 * @description 계정 보안 변경 알림 요청 (작업 큐 경유, 발송 실패는 재시도)
 * @param queue 작업 큐
 * @returns 알림 요청기
 */
export const createSecurityNotifier = (queue: JobQueue): SecurityNotifier => ({
  notify: (kind, to, hint) =>
    queue.send(SECURITY_NOTICE_QUEUE, { kind, to, hint } satisfies SecurityNoticeJob),
});

/**
 * @description 보안 알림 발송 작업 처리기 등록
 * @param queue 작업 큐
 * @param mailer 메일 발송기
 */
export const registerSecurityNoticeWorker = async (queue: JobQueue, mailer: Mailer) => {
  await queue.register(SECURITY_NOTICE_QUEUE, { retryLimit: 5, retryDelaySeconds: 30 });
  await queue.work<SecurityNoticeJob>(SECURITY_NOTICE_QUEUE, (job) =>
    mailer.send(buildSecurityNoticeEmail(job.kind, job.to, job.hint)),
  );
};
