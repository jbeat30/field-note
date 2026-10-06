import type { CompanySettings, Device } from '@field-note/shared';

import { DEMO_ACCOUNTS, DEMO_DEVICES, MOCK_SESSION_STORAGE_KEY, type MockAccount } from './data';

// 목업 서버의 메모리 상태. 새로고침해도 로그인이 유지되도록 로그인 아이디만 sessionStorage에 보관
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

let state = createInitialState();

const readSavedLoginId = () => {
  try {
    return sessionStorage.getItem(MOCK_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveLoginId = (loginId: string | null) => {
  try {
    if (loginId) {
      sessionStorage.setItem(MOCK_SESSION_STORAGE_KEY, loginId);
    } else {
      sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    }
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 새로고침 시 로그아웃되는 것으로 충분
  }
};

export const resetMockState = () => {
  state = createInitialState();
  saveLoginId(null);
};

export const findAccount = (loginId: string) =>
  state.accounts.find((account) => account.loginId === loginId);

export const getCurrentAccount = (): MockAccount | undefined => {
  const loginId = state.currentLoginId ?? readSavedLoginId();

  return loginId ? findAccount(loginId) : undefined;
};

export const signIn = (loginId: string) => {
  state.currentLoginId = loginId;
  saveLoginId(loginId);
};

export const signOut = () => {
  state.currentLoginId = null;
  saveLoginId(null);
};

export const addAccount = (account: MockAccount) => {
  state.accounts.push(account);
};

export const updateSettings = (account: MockAccount, settings: CompanySettings) => {
  account.settings = settings;
};

export const listDevices = (): Device[] =>
  state.devices.map((device) => ({ ...device, isCurrent: device.id === 'device-current' }));

export const removeDevice = (id: string) => {
  const before = state.devices.length;

  state.devices = state.devices.filter((device) => device.id !== id);

  return state.devices.length < before;
};
