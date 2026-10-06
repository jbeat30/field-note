import type { Express } from 'express';

import { FAKE_PROFILES, signFakeCode } from './provider';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

/**
 * @description 개발 환경 전용 가짜 카카오 로그인 화면. 카카오 앱 등록 전에도 연동·로그인·가입 흐름을 끝까지 테스트
 * 운영에서는 이 함수를 호출하지 않으므로 해당 주소는 존재하지 않는다 (호출 여부는 `chooseSocialProvider` 결과로만 결정)
 * @param app Express 앱
 * @param secret 가짜 인가 코드 서명용 비밀 값
 */
export const mountFakeKakaoRoutes = (app: Express, secret: string) => {
  app.get('/api/v1/dev/fake-kakao/authorize', (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const callback = (params: Record<string, string>) =>
      `/api/v1/auth/kakao/callback?${new URLSearchParams({ ...params, state }).toString()}`;
    const items = Object.entries(FAKE_PROFILES)
      .map(
        ([key, profile]) =>
          `<li><a href="${escapeHtml(callback({ code: signFakeCode(secret, key) }))}">${escapeHtml(profile.label)}<br /><small>${escapeHtml(
            profile.verifiedEmail ?? '인증된 이메일 없음',
          )}</small></a></li>`,
      )
      .join('');

    res
      .type('html')
      .send(
        `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>가짜 카카오 로그인 (개발 전용)</title><style>body{font-family:system-ui;max-width:28rem;margin:2rem auto;padding:0 1rem}li{margin:.75rem 0;list-style:none}a{display:block;padding:.75rem 1rem;border:1px solid #cbd5e1;border-radius:.5rem;text-decoration:none;color:#0f172a}small{color:#475569}</style></head><body><h1>가짜 카카오 로그인</h1><p>개발 환경에서만 보이는 화면입니다. 로그인할 카카오 계정을 고르세요.</p><ul>${items}<li><a href="${escapeHtml(callback({ error: 'access_denied' }))}">취소 (동의하지 않음)</a></li></ul></body></html>`,
      );
  });
};
