import type { Mailer } from '../email/mailer';

import { PUBLIC_DEMO } from './publicDemo';

/**
 * @description 시연 계정으로 가는 메일 차단 (인증·비밀번호 재설정·보안 알림 등 방문자의 행동이 시연 메일함으로 쏟아지는 것을 막음)
 * 다른 주소로 가는 메일은 그대로 전달
 * @param mailer 실제 메일 발송기
 * @param onSkip 차단했을 때 호출 (주소는 넘기지 않음)
 * @returns 시연 계정 수신을 건너뛰는 메일 발송기
 */
export const guardDemoMailer = (mailer: Mailer, onSkip?: () => void): Mailer => ({
  send: async (message) => {
    if (message.to.trim().toLowerCase() === PUBLIC_DEMO.email.toLowerCase()) {
      onSkip?.();
      return;
    }

    await mailer.send(message);
  },
});
