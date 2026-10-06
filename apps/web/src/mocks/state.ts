import type { CompanySettings, Device } from '@field-note/shared';

import { DEMO_ACCOUNTS, DEMO_DEVICES, MOCK_SESSION_STORAGE_KEY, type MockAccount } from './data';

// 목업 서버 상태. 새로고침해도 입력한 설정·가입·기기 변경이 유지되도록 sessionStorage에 저장 (탭을 닫으면 초기화)
type MockState = {
  accounts: MockAccount[];
  currentLoginId: string | null;
  devices: Omit<Device, 'isCurrent'>[];
};

const createInitialState = (): MockState => ({
  accounts: DEMO_ACCOUNTS.map((account) => ({ ...account, settings: { ...account.settings } })),
  currentLoginId: null,
  devices: DEMO_DEVICES.map((device) => ({ ...device })),
});

const loadState = (): MockState => {
  try {
    const saved = sessionStorage.getItem(MOCK_SESSION_STORAGE_KEY);

    return saved ? (JSON.parse(saved) as MockState) : createInitialState();
  } catch {
    // 저장소를 쓸 수 없거나 값이 깨진 경우 초기 상태로 시작
    return createInitialState();
  }
};

let state = loadState();

// 연속 로그인 실패 횟수 (실제 서버의 잠금 정책을 흉내, 새로고침하면 초기화)
const failedLogins = new Map<string, number>();

export const MOCK_MAX_FAILED_LOGINS = 5;

export const recordFailedLogin = (loginId: string) => {
  const count = (failedLogins.get(loginId) ?? 0) + 1;

  failedLogins.set(loginId, count);

  return count;
};

export const clearFailedLogins = (loginId: string) => {
  failedLogins.delete(loginId);
};

export const isLoginLocked = (loginId: string) =>
  (failedLogins.get(loginId) ?? 0) >= MOCK_MAX_FAILED_LOGINS;

const persist = () => {
  try {
    sessionStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 새로고침 시 초기화되는 것으로 충분
  }
};

export const resetMockState = () => {
  state = createInitialState();
  failedLogins.clear();

  try {
    sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
  } catch {
    // 위와 같음
  }
};

export const findAccount = (loginId: string) =>
  state.accounts.find((account) => account.loginId === loginId);

export const getCurrentAccount = (): MockAccount | undefined =>
  state.currentLoginId ? findAccount(state.currentLoginId) : undefined;

export const signIn = (loginId: string) => {
  state.currentLoginId = loginId;
  persist();
};

export const signOut = () => {
  state.currentLoginId = null;
  persist();
};

export const addAccount = (account: MockAccount) => {
  state.accounts.push(account);
  persist();
};

export const markEmailVerified = (account: MockAccount) => {
  account.isEmailVerified = true;
  persist();
};

export const updateSettings = (account: MockAccount, settings: CompanySettings) => {
  account.settings = settings;
  persist();
};

export const listDevices = (): Device[] =>
  state.devices.map((device) => ({ ...device, isCurrent: device.id === 'device-current' }));

export const removeDevice = (id: string) => {
  const before = state.devices.length;

  state.devices = state.devices.filter((device) => device.id !== id);
  persist();

  return state.devices.length < before;
};
