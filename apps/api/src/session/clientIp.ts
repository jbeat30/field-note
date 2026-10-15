import type { Request } from 'express';

/**
 * @description 요청의 접속 IP (기기 목록에 보임). IPv4를 IPv6 형태로 감싼 값(::ffff:203.0.113.5)은 IPv4로 풀어 쓴다
 * @param request 요청
 * @returns IP 문자열 (알 수 없으면 undefined)
 */
export const clientIp = (request: Pick<Request, 'ip'>): string | undefined => {
  const ip = request.ip?.trim();

  if (!ip) return undefined;

  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
};
