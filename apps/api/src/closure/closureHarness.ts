import { createAccountService, type AccountService } from '../auth/accountService';
import { createSocialService } from '../auth/socialService';
import type { TestDatabase } from '../db/testDatabase';
import { createMemoryMailer } from '../email/mailer';
import { createSecurityNotifier, registerSecurityNoticeWorker } from '../email/securityNotice';
import { createCompanyWithInvitation } from '../operator/operatorService';
import { createMemoryQueue } from '../queue/jobQueue';
import { createPrismaSessionStore } from '../session/sessionStore';

import { createClosureService, registerClosureWorker } from './closureService';

export const OLD_PASSWORD = 'Correct-horse-2026!';

// 하네스를 여러 번 만들어도 아이디·이메일이 겹치지 않도록 모듈 수준에서 증가
let sequence = 0;

// 해지 관련 테스트가 공통으로 쓰는 도구: 시계를 조작할 수 있고, 큐·메일은 메모리 (큐는 보낸 즉시 처리)
export const createClosureHarness = async (db: TestDatabase, documentIds: string[]) => {
  const clock = { ms: Date.now() };
  const now = () => new Date(clock.ms);
  const { queue } = createMemoryQueue();
  const { mailer, sent: mails } = createMemoryMailer();
  const accountService: AccountService = createAccountService({ auth: db.auth, app: db.app, now });
  const sessionStore = createPrismaSessionStore(db.auth, now);
  const social = createSocialService({ auth: db.auth, now });
  const notifier = createSecurityNotifier(queue);
  const closure = createClosureService({
    auth: db.auth,
    queue,
    mailer,
    accountService,
    notifier,
    appOrigin: 'http://localhost:5173',
    now,
  });

  await registerClosureWorker(queue, closure);
  await registerSecurityNoticeWorker(queue, mailer);

  // 아이디·비밀번호로 가입한 계정
  const passwordAccount = async (name = `해지회사${(sequence += 1)}`) => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: name,
      adminName: '해지관리자',
      operator: 'test',
    });
    const email = `closure${sequence}@example.com`;
    const loginId = `closure-user-${sequence}`;

    await accountService.signup({
      inviteToken: invitation.token,
      loginId,
      password: OLD_PASSWORD,
      email,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
    });

    return {
      account: { userId: invitation.userId, companyId: invitation.companyId },
      email,
      loginId,
    };
  };

  // 소셜 로그인만 쓰는 계정
  const socialOnlyAccount = async (providerUserId: string, email: string) => {
    sequence += 1;

    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: `소셜해지회사${sequence}`,
      adminName: '소셜관리자',
      operator: 'test',
    });

    await social.signup({
      inviteToken: invitation.token,
      consents: documentIds.map((documentId) => ({ documentId, isAgreed: true })),
      provider: 'KAKAO',
      providerUserId,
      verifiedEmail: email,
    });

    return { userId: invitation.userId, companyId: invitation.companyId };
  };

  // 메일 본문에서 해지 취소 링크의 토큰을 꺼냄
  const lastCancelToken = () =>
    /\/closure\/cancel\/([\w-]+)/.exec(mails.at(-1)?.text ?? '')?.[1] ?? '';

  return {
    clock,
    now,
    accountService,
    sessionStore,
    closure,
    mails,
    passwordAccount,
    socialOnlyAccount,
    lastCancelToken,
  };
};
