import type { Request, Response } from 'express';

// 세션에서 얻은 인증 정보 (회사 ID의 유일한 출처)
export type AuthContext = {
  userId: string;
  companyId: string;
};

// 요청에서 인증 정보를 꺼내는 함수 (응답을 받는 이유: 세션 토큰을 교체할 때 새 쿠키를 내려보내기 위함)
export type AuthResolver = (req: Request, res: Response) => Promise<AuthContext | null>;

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
