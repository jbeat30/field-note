import { TOTP_RECOVERY_CODE_COUNT, type TotpStatus } from '@field-note/shared';

import type { PrismaClient } from '../db/client';

import type { AuthenticatedAccount } from './accountService';
import {
  buildOtpauthUrl,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCode,
  generateTotpSecret,
  hashRecoveryCode,
  matchTotpStep,
  normalizeRecoveryCode,
} from './totp';

type Clock = () => Date;

export type TotpErrorCode =
  'ALREADY_ENABLED' | 'NOT_ENABLED' | 'SETUP_NOT_STARTED' | 'CODE_INVALID';

// 업무 규칙 위반 (HTTP 응답으로의 변환은 라우트가 담당)
export class TotpError extends Error {
  constructor(readonly code: TotpErrorCode) {
    super(`[auth.totpService] ${code}`);
  }
}

export type TotpService = {
  getStatus: (account: AuthenticatedAccount) => Promise<TotpStatus>;
  // 로그인·재설정에 코드를 요구하는 계정인지 (등록 중이면 false)
  isEnabled: (account: AuthenticatedAccount) => Promise<boolean>;
  // 새 인증 키를 만들어 등록 시작 (확인 전에는 켜지지 않고, 다시 시작하면 이전 키는 버려짐)
  beginSetup: (account: AuthenticatedAccount) => Promise<{ secret: string; otpauthUrl: string }>;
  // 인증 앱의 코드로 등록 확인, 켜지면서 복구 코드를 처음 발급
  enable: (account: AuthenticatedAccount, code: string) => Promise<string[]>;
  // 6자리 코드(같은 구간 재사용 불가) 또는 복구 코드(한 번만 사용)가 맞는지 확인
  verify: (account: AuthenticatedAccount, code: string) => Promise<boolean>;
  disable: (account: AuthenticatedAccount) => Promise<void>;
  // 복구 코드를 모두 새로 발급 (이전 코드는 즉시 무효)
  regenerateRecoveryCodes: (account: AuthenticatedAccount) => Promise<string[]>;
};

type Deps = {
  auth: PrismaClient;
  // 인증 키 암호화에 쓰는 서버 비밀 값
  secretKey: string;
  // 인증 앱에 보이는 서비스 이름
  issuer: string;
  now?: Clock;
};

const DIGITS = /^\d{6}$/;
// 복구 코드는 하이픈을 뺀 10자
const RECOVERY_LENGTH = 10;

const newRecoveryCodes = () =>
  Array.from({ length: TOTP_RECOVERY_CODE_COUNT }, generateRecoveryCode);

/**
 * @description 2단계 인증(TOTP) 서비스 (회사 범위 밖 전용 계정으로 동작)
 * @param deps 전용 계정 클라이언트, 서버 비밀 값, 서비스 이름, 시계
 * @returns 2단계 인증 서비스
 */
export const createTotpService = ({
  auth,
  secretKey,
  issuer,
  now = () => new Date(),
}: Deps): TotpService => {
  const keyOf = ({ companyId, userId }: AuthenticatedAccount) => ({
    companyId_userId: { companyId, userId },
  });

  const find = (account: AuthenticatedAccount) =>
    auth.userTotp.findUnique({ where: keyOf(account) });

  return {
    getStatus: async (account) => {
      const row = await find(account);

      return row?.enabledAt
        ? { isEnabled: true, recoveryCodesLeft: row.recoveryCodeHashes.length }
        : { isEnabled: false, recoveryCodesLeft: 0 };
    },

    isEnabled: async (account) => Boolean((await find(account))?.enabledAt),

    beginSetup: async (account) => {
      const existing = await find(account);

      if (existing?.enabledAt) {
        throw new TotpError('ALREADY_ENABLED');
      }

      const secret = generateTotpSecret();
      const data = {
        secretEncrypted: encryptTotpSecret(secret, secretKey),
        enabledAt: null,
        lastUsedStep: 0,
        recoveryCodeHashes: [],
      };

      await auth.userTotp.upsert({
        where: keyOf(account),
        update: data,
        create: { companyId: account.companyId, userId: account.userId, ...data },
      });

      // 인증 앱 목록에서 구분하기 쉽게 아이디(없으면 이메일)를 계정 이름으로 표시
      const [credential, user] = await Promise.all([
        auth.userCredential.findUnique({ where: keyOf(account) }),
        auth.user.findFirst({ where: { companyId: account.companyId, id: account.userId } }),
      ]);
      const label = credential?.loginId ?? user?.email ?? user?.displayName ?? 'account';

      return { secret, otpauthUrl: buildOtpauthUrl({ issuer, account: label, secret }) };
    },

    enable: async (account, code) => {
      const row = await find(account);

      if (!row) {
        throw new TotpError('SETUP_NOT_STARTED');
      }

      if (row.enabledAt) {
        throw new TotpError('ALREADY_ENABLED');
      }

      const at = now();
      const step = DIGITS.test(code)
        ? matchTotpStep(decryptTotpSecret(row.secretEncrypted, secretKey), code, at)
        : null;

      if (step === null) {
        throw new TotpError('CODE_INVALID');
      }

      const recoveryCodes = newRecoveryCodes();
      // 등록 확인 요청이 동시에 두 번 와도 한 번만 켜지도록 조건부로 갱신
      const { count } = await auth.userTotp.updateMany({
        where: { ...keyOf(account).companyId_userId, enabledAt: null },
        data: {
          enabledAt: at,
          lastUsedStep: step,
          recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
        },
      });

      if (count !== 1) {
        throw new TotpError('ALREADY_ENABLED');
      }

      return recoveryCodes;
    },

    verify: async (account, code) => {
      const row = await find(account);

      if (!row?.enabledAt) {
        return false;
      }

      const input = code.trim();

      if (DIGITS.test(input)) {
        const step = matchTotpStep(decryptTotpSecret(row.secretEncrypted, secretKey), input, now());

        if (step === null) {
          return false;
        }

        // 같은 구간의 코드를 다시 쓸 수 없도록 더 큰 구간일 때만 갱신 (동시 요청도 한쪽만 통과)
        const { count } = await auth.userTotp.updateMany({
          where: { ...keyOf(account).companyId_userId, lastUsedStep: { lt: step } },
          data: { lastUsedStep: step },
        });

        return count === 1;
      }

      const normalized = normalizeRecoveryCode(input);

      if (normalized.length !== RECOVERY_LENGTH) {
        return false;
      }

      const hash = hashRecoveryCode(normalized);
      // 목록에서 제거하는 한 번의 문장으로 처리해 같은 코드가 두 번 통과하지 못하게 함
      const removed = await auth.$executeRaw`
        UPDATE user_totp
           SET recovery_code_hashes = array_remove(recovery_code_hashes, ${hash}), updated_at = now()
         WHERE company_id = ${account.companyId}::uuid AND user_id = ${account.userId}::uuid
           AND ${hash} = ANY(recovery_code_hashes)`;

      return removed === 1;
    },

    disable: async (account) => {
      await auth.userTotp.deleteMany({ where: keyOf(account).companyId_userId });
    },

    regenerateRecoveryCodes: async (account) => {
      const recoveryCodes = newRecoveryCodes();
      const { count } = await auth.userTotp.updateMany({
        where: { ...keyOf(account).companyId_userId, enabledAt: { not: null } },
        data: { recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode) },
      });

      if (count !== 1) {
        throw new TotpError('NOT_ENABLED');
      }

      return recoveryCodes;
    },
  };
};
