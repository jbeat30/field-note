import { DEMO_ACCOUNTS } from '@field-note/shared/demo';

import { LOCAL_DEMO_DATASET, type DemoDataset } from '../db/seed';

import { PUBLIC_DEMO } from './publicDemo';

// 시연 회사의 원본: 개발용 샘플 중 판금 회사 (프로젝트 5건이 진행·예정·중단·완료·종료 상태를 모두 포함)
const SOURCE_LOGIN_ID = 'hanbit';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 생년월일은 나이가 달라져 보이므로 옮기지 않음
const FIXED_DATE_KEYS = new Set(['birthDate']);

const toDay = (date: string): number => Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;

const shiftDate = (date: string, days: number): string =>
  new Date((toDay(date) + days) * DAY_MS).toISOString().slice(0, 10);

// 값이 날짜 문자열(YYYY-MM-DD)인 항목을 모두 같은 일수만큼 옮김
const shiftDates = <T>(value: T, days: number, key?: string): T => {
  if (typeof value === 'string') {
    return (
      DATE_PATTERN.test(value) && !FIXED_DATE_KEYS.has(key ?? '') ? shiftDate(value, days) : value
    ) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => shiftDates(item, days)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, shiftDates(item, days, name)]),
    ) as T;
  }

  return value;
};

/**
 * @description 시연 회사에 입력할 가상 데이터 묶음 (개발용 샘플을 시연 회사로 옮겨 담음)
 * 모든 날짜를 7의 배수 일수만큼 옮겨 가장 최근 작업 일지가 오늘(한국 시간) 이전 일주일 안에 오게 함 (요일 배치는 유지)
 * 초기화할 때마다 다시 만들므로 "이번 달" 화면이 비지 않음
 * 실제 개인정보는 없고 연락처는 쓰이지 않는 0000 대역, 이메일은 시연 계정 하나뿐
 * @param now 기준 시각
 * @returns 시연 회사 데이터 묶음
 */
export const buildPublicDemoDataset = (now: Date = new Date()): DemoDataset => {
  const source = DEMO_ACCOUNTS.find((account) => account.loginId === SOURCE_LOGIN_ID);

  if (!source) {
    throw new Error('[demo.dataset] 원본 샘플 회사를 찾을 수 없음');
  }

  const move = <T extends { companyId: string }>(items: readonly T[]): T[] =>
    items
      .filter((item) => item.companyId === source.companyId)
      .map((item) => ({ ...item, companyId: PUBLIC_DEMO.companyId }));

  const dataset: DemoDataset = {
    accounts: [
      {
        companyId: PUBLIC_DEMO.companyId,
        userId: PUBLIC_DEMO.userId,
        companyName: PUBLIC_DEMO.companyName,
        loginId: PUBLIC_DEMO.loginId,
        password: PUBLIC_DEMO.password,
        displayName: PUBLIC_DEMO.displayName,
        email: PUBLIC_DEMO.email,
        isEmailVerified: true,
        settings: source.settings,
      },
    ],
    employees: move(LOCAL_DEMO_DATASET.employees),
    partners: move(LOCAL_DEMO_DATASET.partners),
    projects: move(LOCAL_DEMO_DATASET.projects),
    assignments: move(LOCAL_DEMO_DATASET.assignments),
    workLogs: move(LOCAL_DEMO_DATASET.workLogs),
    changeWorks: move(LOCAL_DEMO_DATASET.changeWorks),
    warranties: move(LOCAL_DEMO_DATASET.warranties),
    credentials: move(LOCAL_DEMO_DATASET.credentials),
    requiredCredentials: move(LOCAL_DEMO_DATASET.requiredCredentials),
    repairs: move(LOCAL_DEMO_DATASET.repairs),
    payRates: move(LOCAL_DEMO_DATASET.payRates),
    progress: move(LOCAL_DEMO_DATASET.progress),
  };

  const latest = Math.max(...dataset.workLogs.map((log) => toDay(log.workDate)));
  const today = Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS);
  const weeks = Math.floor((today - latest) / 7);

  return shiftDates(dataset, weeks * 7);
};
