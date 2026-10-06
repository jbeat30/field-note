import {
  LAST_ACTIVE_TOUCH_INTERVAL_MS,
  SESSION_MAX_AGE_MS,
  type SessionStore,
} from './sessionStore';

// 회사당 계정은 하나이므로 사용자마다 다른 회사
export const COMPANY_1 = '0198a000-0000-7000-8000-00000000000a';
export const COMPANY_2 = '0198a000-0000-7000-8000-00000000000b';
export const USER_1 = '0198a000-0000-7000-8000-0000000000a1';
export const USER_2 = '0198a000-0000-7000-8000-0000000000a2';

export type ContractContext = {
  // 시각을 조작할 수 있는 저장소 생성
  createStore: (now: () => Date) => SessionStore;
  // 저장된 값에 토큰 원문이 없는지 점검하기 위한 전체 조회
  readStoredValues?: () => Promise<string[]>;
  // 공유 저장소를 쓰는 구현은 테스트마다 비워 이전 테스트의 세션이 섞이지 않게 함
  reset?: () => Promise<void>;
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

    beforeEach(async () => {
      await getContext().reset?.();
      nowMs = Date.parse('2026-10-05T00:00:00Z');
      store = getContext().createStore(() => new Date(nowMs));
    });

    it('만든 세션의 토큰으로 사용자와 회사를 찾는다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      expect(await store.find(token)).toEqual({ userId: USER_1, companyId: COMPANY_1 });
    });

    it('알 수 없는 토큰은 찾지 못한다', async () => {
      expect(await store.find('not-a-real-token')).toBeNull();
    });

    it('만료된 세션은 찾지 못한다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      nowMs += SESSION_MAX_AGE_MS + 1000;

      expect(await store.find(token)).toBeNull();
    });

    it('삭제한 세션은 찾지 못한다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      await store.delete(token);

      expect(await store.find(token)).toBeNull();
    });

    it('사용자 기준으로 모든 세션을 삭제하고 다른 사용자 세션은 유지한다', async () => {
      const first = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const second = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const other = await store.create({ userId: USER_2, companyId: COMPANY_2 });

      await store.deleteByUser(USER_1);

      expect(await store.find(first.token)).toBeNull();
      expect(await store.find(second.token)).toBeNull();
      expect(await store.find(other.token)).not.toBeNull();
    });

    it('현재 세션만 남기고 같은 사용자의 다른 세션을 삭제한다', async () => {
      const current = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const other = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const stranger = await store.create({ userId: USER_2, companyId: COMPANY_2 });

      await store.deleteByUserExcept(USER_1, current.token);

      expect(await store.find(current.token)).not.toBeNull();
      expect(await store.find(other.token)).toBeNull();
      expect(await store.find(stranger.token)).not.toBeNull();
    });

    it('기기 목록에 이름·마지막 사용 시각·현재 기기 표시가 담기고 최근 사용 순으로 정렬된다', async () => {
      const first = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: 'Chrome · macOS' },
      );

      nowMs += 60_000;
      const second = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: 'Safari · iPhone' },
      );
      const devices = await store.listDevices(USER_1, first.token);

      expect(devices.map((device) => device.label)).toEqual(['Safari · iPhone', 'Chrome · macOS']);
      expect(devices.map((device) => device.isCurrent)).toEqual([false, true]);
      expect(devices[1]?.lastActiveAt).toEqual(new Date(nowMs - 60_000));
      expect(second.token).not.toBe(first.token);
    });

    it('기기 식별자는 토큰이나 해시와 무관하다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const [device] = await store.listDevices(USER_1, token);

      expect(device?.id).toBeDefined();
      expect(device?.id).not.toContain(token);
      expect(JSON.stringify(device)).not.toContain(token);
    });

    it('이름이 없으면 "알 수 없는 기기"로 표시한다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      expect((await store.listDevices(USER_1, token))[0]?.label).toBe('알 수 없는 기기');
    });

    it('기기 목록에는 만료된 세션과 다른 사용자의 세션이 없다', async () => {
      const old = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: '옛 기기' },
      );

      nowMs += SESSION_MAX_AGE_MS + 1000;
      const fresh = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: '새 기기' },
      );

      await store.create({ userId: USER_2, companyId: COMPANY_2 }, { deviceLabel: '남의 기기' });

      const labels = (await store.listDevices(USER_1, fresh.token)).map((device) => device.label);

      expect(labels).toEqual(['새 기기']);
      expect(old.token).not.toBe(fresh.token);
    });

    it('다른 기기를 원격 로그아웃하면 그 세션만 무효가 된다', async () => {
      const current = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: '현재' },
      );
      const other = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: '다른' },
      );
      const target = (await store.listDevices(USER_1, current.token)).find(
        (device) => !device.isCurrent,
      )!;

      expect(await store.revokeDevice(USER_1, target.id, current.token)).toBe(true);
      expect(await store.find(other.token)).toBeNull();
      expect(await store.find(current.token)).not.toBeNull();
      expect(await store.revokeDevice(USER_1, target.id, current.token)).toBe(false);
    });

    it('현재 기기와 다른 사용자의 기기, 없는 식별자는 원격 로그아웃할 수 없다', async () => {
      const current = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const stranger = await store.create({ userId: USER_2, companyId: COMPANY_2 });
      const [mine] = await store.listDevices(USER_1, current.token);
      const [theirs] = await store.listDevices(USER_2, stranger.token);

      expect(await store.revokeDevice(USER_1, mine!.id, current.token)).toBe(false);
      expect(await store.revokeDevice(USER_1, theirs!.id, current.token)).toBe(false);
      expect(
        await store.revokeDevice(USER_1, '0198f000-0000-7000-8000-000000000000', current.token),
      ).toBe(false);
      expect(await store.find(stranger.token)).not.toBeNull();
    });

    it('마지막 사용 시각은 갱신 간격이 지난 뒤에만 바뀐다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const created = new Date(nowMs);

      nowMs += 60_000;
      await store.find(token);

      expect((await store.listDevices(USER_1, token))[0]?.lastActiveAt).toEqual(created);

      nowMs += LAST_ACTIVE_TOUCH_INTERVAL_MS;
      await store.find(token);

      expect((await store.listDevices(USER_1, token))[0]?.lastActiveAt).toEqual(new Date(nowMs));
    });

    it('만료된 세션만 정리한다', async () => {
      const old = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      nowMs += SESSION_MAX_AGE_MS + 1000;
      const fresh = await store.create({ userId: USER_2, companyId: COMPANY_2 });

      await store.deleteExpired();

      expect(await store.find(old.token)).toBeNull();
      expect(await store.find(fresh.token)).not.toBeNull();
    });

    it('세션마다 서로 다른 토큰을 발급한다', async () => {
      const first = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const second = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      expect(first.token).not.toBe(second.token);
      expect(first.token.length).toBeGreaterThanOrEqual(43);
    });

    it('저장소에는 토큰 원문을 남기지 않는다', async () => {
      const readStoredValues = getContext().readStoredValues;

      if (!readStoredValues) {
        return;
      }

      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });
      const stored = await readStoredValues();

      expect(stored.length).toBeGreaterThan(0);
      expect(stored.some((value) => value.includes(token))).toBe(false);
    });
  });
};
