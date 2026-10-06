import argon2 from 'argon2';

// OWASP 권장 최소 기준 argon2id (메모리 19MiB, 반복 2, 병렬 1)
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/**
 * @description 비밀번호를 복원 불가능한 해시로 변환 (솔트·파라미터 포함 PHC 문자열)
 * @param password 평문 비밀번호
 * @returns 저장용 해시
 */
export const hashPassword = (password: string) => argon2.hash(password, OPTIONS);

/**
 * @description 평문 비밀번호와 저장된 해시 비교 (해시 형식 오류는 불일치로 처리)
 * @param hash 저장된 해시
 * @param password 입력한 평문 비밀번호
 * @returns 일치 여부
 */
export const verifyPassword = async (hash: string, password: string) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};
