import type { Request } from 'express';

// 세션에서 얻은 인증 정보 (회사 ID의 유일한 출처)
export type AuthContext = {
  userId: string;
  companyId: string;
};

// 요청에서 인증 정보를 꺼내는 함수 (세션 구현은 T0-7에서 제공, 그 전에는 항상 없음)
export type AuthResolver = (req: Request) => Promise<AuthContext | null>;

export type ValidatedInput = {
  params: unknown;
  query: unknown;
  body: unknown;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      auth?: AuthContext;
      input?: ValidatedInput;
    }
  }
}
