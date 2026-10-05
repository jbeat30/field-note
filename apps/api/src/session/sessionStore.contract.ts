import { SESSION_MAX_AGE_MS, type SessionStore } from './sessionStore';

const COMPANY = '0198a000-0000-7000-8000-00000000000a';
const USER_1 = '0198a000-0000-7000-8000-0000000000a1';
const USER_2 = '0198a000-0000-7000-8000-0000000000a2';

export type ContractContext = {
  // 시각을 조작할 수 있는 저장소 생성
  createStore: (now: () => Date) => SessionStore;
  // 저장된 값에 토큰 원문이 없는지 점검하기 위한 전체 조회
  readStoredValues?: () => Promise<string[]>;
};

/**
 * @description 메모리·PostgreSQL 저장소가 같은 규칙을 지키는지 검사하는 공통 테스트
 * @param name 저장소 이름
 * @param getContext 테스트 컨텍스트 (DB 준비가 필요하면 beforeAll 이후 평가)
 */
export const describeSessionStoreContract = (name: string, getContext: () => ContractContext) => {
  describe(`세션 저장소 규칙: ${name}`, () => {
    let nowMs = Date.parse('2026-10-05T00:00:00Z');
    let store: SessionStore;

    beforeEach(() => {
      nowMs = Date.parse('2026-10-05T00:00:00Z');
      store = getContext().createStore(() => new Date(nowMs));
    });

    it('만든 세션의 토큰으로 사용자와 회사를 찾는다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY });

      expect(await store.find(token)).toEqual({ userId: USER_1, companyId: COMPANY });
    });

    it('알 수 없는 토큰은 찾지 못한다', async () => {
      expect(await store.find('not-a-real-token')).toBeNull();
    });

    it('만료된 세션은 찾지 못한다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY });

      nowMs += SESSION_MAX_AGE_MS + 1000;

      expect(await store.find(token)).toBeNull();
    });

    it('삭제한 세션은 찾지 못한다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY });

      await store.delete(token);

      expect(await store.find(token)).toBeNull();
    });

    it('사용자 기준으로 모든 세션을 삭제하고 다른 사용자 세션은 유지한다', async () => {
      const first = await store.create({ userId: USER_1, companyId: COMPANY });
      const second = await store.create({ userId: USER_1, companyId: COMPANY });
      const other = await store.create({ userId: USER_2, companyId: COMPANY });

      await store.deleteByUser(USER_1);

      expect(await store.find(first.token)).toBeNull();
      expect(await store.find(second.token)).toBeNull();
      expect(await store.find(other.token)).not.toBeNull();
    });

    it('만료된 세션만 정리한다', async () => {
      const old = await store.create({ userId: USER_1, companyId: COMPANY });

      nowMs += SESSION_MAX_AGE_MS + 1000;
      const fresh = await store.create({ userId: USER_2, companyId: COMPANY });

      await store.deleteExpired();

      expect(await store.find(old.token)).toBeNull();
      expect(await store.find(fresh.token)).not.toBeNull();
    });

    it('세션마다 서로 다른 토큰을 발급한다', async () => {
      const first = await store.create({ userId: USER_1, companyId: COMPANY });
      const second = await store.create({ userId: USER_1, companyId: COMPANY });

      expect(first.token).not.toBe(second.token);
      expect(first.token.length).toBeGreaterThanOrEqual(43);
    });

    it('저장소에는 토큰 원문을 남기지 않는다', async () => {
      const readStoredValues = getContext().readStoredValues;

      if (!readStoredValues) {
        return;
      }

      const { token } = await store.create({ userId: USER_1, companyId: COMPANY });
      const stored = await readStoredValues();

      expect(stored.length).toBeGreaterThan(0);
      expect(stored.some((value) => value.includes(token))).toBe(false);
    });
  });
};
