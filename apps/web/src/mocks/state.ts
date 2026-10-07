import {
  OPTION_KINDS,
  OPTION_PRESETS,
  normalizeOptionName,
  type CompanySettings,
  type Device,
  type EmployeeDetail,
  type OptionItem,
} from '@field-note/shared';

import { DEMO_ACCOUNTS, DEMO_DEVICES, MOCK_SESSION_STORAGE_KEY, type MockAccount } from './data';
import { DEMO_EMPLOYEES } from './demoSource';

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

// 비밀번호 재설정 시연 상태 (새로고침하면 초기화)
let resetTargetLoginId: string | null = null;
let isResetTokenUsed = false;

export const requestMockReset = (loginId: string) => {
  resetTargetLoginId = loginId;
};

export const getMockResetTarget = () => resetTargetLoginId;

export const isMockResetUsable = () => !isResetTokenUsed;

export const consumeMockReset = () => {
  isResetTokenUsed = true;
};

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
  resetTargetLoginId = null;
  isResetTokenUsed = false;

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

export const setPassword = (account: MockAccount, password: string) => {
  account.password = password;
  persist();
};

export const setPendingEmail = (account: MockAccount, email: string) => {
  account.pendingEmail = email;
  persist();
};

// 이메일 변경 인증이 끝나면 새 주소로 반영
export const applyPendingEmail = (account: MockAccount) => {
  if (account.pendingEmail) {
    account.email = account.pendingEmail;
    account.pendingEmail = undefined;
  }

  account.isEmailVerified = true;
  persist();
};

export const findAccountByKakao = (profileKey: string) =>
  state.accounts.find((account) => account.kakaoProfileKey === profileKey);

export const setKakaoProfile = (account: MockAccount, profileKey: string | undefined) => {
  account.kakaoProfileKey = profileKey;
  persist();
};

// 해지 요청 (실제 서버처럼 모든 기기 로그아웃은 호출하는 쪽에서 처리)
export const startClosure = (account: MockAccount, purgeAfter: string) => {
  account.closingPurgeAfter = purgeAfter;
  persist();
};

export const cancelClosure = (account: MockAccount) => {
  account.closingPurgeAfter = undefined;
  persist();
};

// 취소 링크가 가리키는 해지 중 계정 (시연용 링크는 하나라 해지 중인 첫 계정)
export const findClosingAccount = () => state.accounts.find((account) => account.closingPurgeAfter);

// 선택 목록: 처음 조회할 때 프리셋으로 채우고 이후에는 계정에 저장된 목록을 그대로 씀 (종류 순서 → 정해진 순서)
export const getOptions = (account: MockAccount): OptionItem[] => {
  if (!account.options) {
    account.options = OPTION_KINDS.flatMap((kind) =>
      OPTION_PRESETS[kind].map((name) => ({
        id: crypto.randomUUID(),
        kind,
        name,
        isActive: true,
      })),
    );
    persist();
  }

  return account.options;
};

export const saveOptions = (account: MockAccount, options: OptionItem[]) => {
  account.options = options;
  persist();
};

// 직원 카드: 처음 조회할 때 더미 직원으로 채움 (직종·구분은 선택 목록 항목과 이름으로 연결, DB 시드와 같은 방식)
export const getEmployees = (account: MockAccount): EmployeeDetail[] => {
  if (!account.employees) {
    const options = getOptions(account);
    const idOf = (kind: OptionItem['kind'], name?: string) =>
      name
        ? (options.find(
            (item) =>
              item.kind === kind && normalizeOptionName(item.name) === normalizeOptionName(name),
          )?.id ?? null)
        : null;

    account.employees = DEMO_EMPLOYEES.filter((item) => item.companyId === account.companyId).map(
      (item) => ({
        id: item.id,
        name: item.name,
        title: item.title ?? null,
        jobTypeId: idOf('JOB_TYPE', item.jobType),
        workerTypeId: idOf('WORKER_TYPE', item.workerType),
        status: item.status,
        hiredOn: item.hiredOn ?? null,
        leftOn: item.leftOn ?? null,
        birthDate: item.birthDate ?? null,
        phone: item.phone ?? null,
        memo: item.memo ?? null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      }),
    );
    persist();
  }

  return account.employees;
};

export const saveEmployees = (account: MockAccount, employees: EmployeeDetail[]) => {
  account.employees = employees;
  persist();
};

export const isEmailInUse = (email: string) =>
  state.accounts.some((account) => account.email === email);

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
