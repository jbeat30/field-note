import { DEMO_ACCOUNTS } from '@field-note/shared/demo';

import { LOCAL_DEMO_DATASET, type DemoDataset } from '../db/seed';

import { PUBLIC_DEMO } from './publicDemo';

// 시연 회사의 원본: 개발용 샘플 중 판금 회사 (프로젝트 5건이 진행·예정·중단·완료·종료 상태를 모두 포함)
const SOURCE_LOGIN_ID = 'hanbit';

/**
 * @description 시연 회사에 입력할 가상 데이터 묶음 (개발용 샘플을 시연 회사로 옮겨 담음)
 * 실제 개인정보는 없고 연락처는 쓰이지 않는 0000 대역, 이메일은 시연 계정 하나뿐
 * @returns 시연 회사 데이터 묶음
 */
export const buildPublicDemoDataset = (): DemoDataset => {
  const source = DEMO_ACCOUNTS.find((account) => account.loginId === SOURCE_LOGIN_ID);

  if (!source) {
    throw new Error('[demo.dataset] 원본 샘플 회사를 찾을 수 없음');
  }

  const move = <T extends { companyId: string }>(items: readonly T[]): T[] =>
    items
      .filter((item) => item.companyId === source.companyId)
      .map((item) => ({ ...item, companyId: PUBLIC_DEMO.companyId }));

  return {
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
};
