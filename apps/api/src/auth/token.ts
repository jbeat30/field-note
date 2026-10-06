import { createHash, randomBytes } from 'node:crypto';

// 세션·초대 링크 등 1회성 토큰 공통 규칙: 추측이 불가능한 256비트 난수, 저장은 해시만

/**
 * @description 256비트 난수 토큰 생성 (URL·쿠키에 그대로 쓸 수 있는 문자만 사용)
 * @returns 토큰 원문 (사용자에게 한 번만 전달)
 */
export const generateToken = () => randomBytes(32).toString('base64url');

/**
 * @description 토큰 해시 (DB 저장·조회용, 원문 복원 불가)
 * @param token 토큰 원문
 * @returns SHA-256 16진수 문자열
 */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
