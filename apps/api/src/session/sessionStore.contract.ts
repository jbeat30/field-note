import {
  ROTATION_GRACE_MS,
  SESSION_ROTATE_INTERVAL_MS,
  SHORT_SESSION_IDLE_MS,
  SHORT_SESSION_MS,
} from '../auth/loginPolicy';

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

    it('로그인 때 IP와 마지막으로 쓴 때의 IP를 기기 목록에 담고, 사용 시각을 갱신할 때 마지막 IP도 갱신한다', async () => {
      const { token } = await store.create(
        { userId: USER_1, companyId: COMPANY_1 },
        { deviceLabel: 'Chrome · macOS', ipAddress: '203.0.113.5' },
      );

      expect((await store.listDevices(USER_1, token))[0]).toMatchObject({
        ipAddress: '203.0.113.5',
        lastIp: '203.0.113.5',
      });

      // 갱신 간격이 지나기 전에는 마지막 IP도 그대로
      nowMs += LAST_ACTIVE_TOUCH_INTERVAL_MS - 1000;
      await store.find(token, '198.51.100.9');
      expect((await store.listDevices(USER_1, token))[0]?.lastIp).toBe('203.0.113.5');

      nowMs += 2000;
      await store.find(token, '198.51.100.9');
      expect((await store.listDevices(USER_1, token))[0]).toMatchObject({
        ipAddress: '203.0.113.5',
        lastIp: '198.51.100.9',
      });
    });

    it('IP를 모르면 null이다', async () => {
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      expect((await store.listDevices(USER_1, token))[0]).toMatchObject({
        ipAddress: null,
        lastIp: null,
      });
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

    describe('유효 기간과 토큰 교체', () => {
      const MINUTE = 60_000;
      const created = { userId: USER_1, companyId: COMPANY_1 };

      it('로그인 유지 세션은 로그인 7일 뒤 만료되고 사용해도 연장되지 않는다', async () => {
        const first = await store.create(created);

        nowMs += 3 * 24 * 60 * MINUTE;
        const middle = await store.find(first.token);

        // 하루 안 쓴 세션도 교체 간격이 지났으므로 새 토큰으로 이어짐
        expect(middle?.rotated).toBeDefined();
        const token = middle!.rotated!.token;

        nowMs += 4 * 24 * 60 * MINUTE - MINUTE;
        expect(await store.find(token)).not.toBeNull();

        nowMs += 2 * MINUTE;
        expect(await store.find(token)).toBeNull();
      });

      it('로그인 유지를 선택하지 않은 세션은 1시간 쓰지 않으면 만료된다', async () => {
        const { token } = await store.create(created, { isRemembered: false });

        nowMs += SHORT_SESSION_IDLE_MS + MINUTE;

        expect(await store.find(token)).toBeNull();
      });

      it('로그인 유지를 선택하지 않은 세션도 사용하면 미사용 만료가 연장된다', async () => {
        let { token } = await store.create(created, { isRemembered: false });

        for (let step = 0; step < 6; step += 1) {
          nowMs += 50 * MINUTE;
          const found = await store.find(token);

          expect(found).not.toBeNull();
          token = found?.rotated?.token ?? token;
        }

        nowMs += SHORT_SESSION_IDLE_MS + MINUTE;
        expect(await store.find(token)).toBeNull();
      });

      it('로그인 유지를 선택하지 않은 세션은 계속 써도 12시간이 지나면 만료된다', async () => {
        let { token } = await store.create(created, { isRemembered: false });
        const startedAt = nowMs;
        let expiredAfterMs: number | null = null;

        for (let step = 0; step < 20 && expiredAfterMs === null; step += 1) {
          nowMs += 50 * MINUTE;
          const found = await store.find(token);

          if (found) {
            token = found.rotated?.token ?? token;
          } else {
            expiredAfterMs = nowMs - startedAt;
          }
        }

        expect(expiredAfterMs).toBeGreaterThan(SHORT_SESSION_MS);
        expect(expiredAfterMs).toBeLessThanOrEqual(SHORT_SESSION_MS + 50 * MINUTE);
      });

      it('교체 간격 전에는 토큰을 바꾸지 않는다', async () => {
        const { token } = await store.create(created);

        nowMs += SESSION_ROTATE_INTERVAL_MS - MINUTE;

        expect(await store.find(token)).toEqual({ userId: USER_1, companyId: COMPANY_1 });
      });

      it('교체 간격이 지나면 새 토큰을 주고 만료 시각과 쿠키 종류는 그대로다', async () => {
        const first = await store.create(created, { isRemembered: false });

        // 미사용 만료(1시간)가 교체 간격과 같아서 중간에 한 번 써야 이어짐
        nowMs += SESSION_ROTATE_INTERVAL_MS / 2;
        await store.find(first.token);
        nowMs += SESSION_ROTATE_INTERVAL_MS / 2;
        const found = await store.find(first.token);

        expect(found?.rotated).toBeDefined();
        expect(found?.rotated?.token).not.toBe(first.token);
        expect(found?.rotated?.expiresAt).toEqual(first.expiresAt);
        expect(found?.rotated?.isPersistent).toBe(false);
        expect(await store.find(found!.rotated!.token)).toEqual({
          userId: USER_1,
          companyId: COMPANY_1,
        });
      });

      it('교체 직전 토큰은 잠시 허용하고(다시 교체하지 않음) 그 뒤에는 거부한다', async () => {
        const first = await store.create(created);

        nowMs += SESSION_ROTATE_INTERVAL_MS;
        const rotated = (await store.find(first.token))!.rotated!;

        nowMs += ROTATION_GRACE_MS - MINUTE;
        expect(await store.find(first.token)).toEqual({ userId: USER_1, companyId: COMPANY_1 });

        nowMs += 2 * MINUTE;
        expect(await store.find(first.token)).toBeNull();
        expect(await store.find(rotated.token)).not.toBeNull();
      });

      it('교체한 뒤에도 이전 토큰으로 지키는 기기 판별·로그아웃이 같은 세션을 가리킨다', async () => {
        const first = await store.create(created);
        const other = await store.create(created, { deviceLabel: '다른 기기' });

        nowMs += SESSION_ROTATE_INTERVAL_MS;
        const rotated = (await store.find(first.token))!.rotated!;

        const devices = await store.listDevices(USER_1, first.token);

        expect(devices.filter((device) => device.isCurrent)).toHaveLength(1);

        await store.deleteByUserExcept(USER_1, first.token);
        expect(await store.find(rotated.token)).not.toBeNull();
        expect(await store.find(other.token)).toBeNull();

        await store.delete(first.token);
        expect(await store.find(rotated.token)).toBeNull();
      });

      it('교체한 뒤 이전 토큰으로는 현재 기기를 원격 로그아웃할 수 없다', async () => {
        const first = await store.create(created);
        const second = await store.create(created, { deviceLabel: '다른 기기' });

        nowMs += SESSION_ROTATE_INTERVAL_MS;
        await store.find(first.token);

        const [mine] = (await store.listDevices(USER_1, first.token)).filter(
          (device) => device.isCurrent,
        );

        expect(await store.revokeDevice(USER_1, mine!.id, first.token)).toBe(false);
        expect(await store.find(second.token)).not.toBeNull();
      });

      it('미사용으로 만료된 세션은 기기 목록에서 빠지고 정리된다', async () => {
        const gone = await store.create(created, { isRemembered: false });

        nowMs += SHORT_SESSION_IDLE_MS + MINUTE;
        const kept = await store.create(created);

        expect((await store.listDevices(USER_1, kept.token)).length).toBe(1);

        await store.deleteExpired();
        expect(await store.find(gone.token)).toBeNull();
        expect(await store.find(kept.token)).not.toBeNull();
      });
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
