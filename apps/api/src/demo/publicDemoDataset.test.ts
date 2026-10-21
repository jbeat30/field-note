import { passwordSchema, loginIdSchema } from '@field-note/shared';

import { PUBLIC_DEMO } from './publicDemo';
import { buildPublicDemoDataset } from './publicDemoDataset';

describe('시연 회사 데이터 묶음', () => {
  const dataset = buildPublicDemoDataset();

  it('시연 계정 하나만 있고 로그인 정보가 정책을 지킨다', () => {
    expect(dataset.accounts).toHaveLength(1);
    expect(dataset.accounts[0]).toMatchObject({
      companyId: PUBLIC_DEMO.companyId,
      userId: PUBLIC_DEMO.userId,
      companyName: 'Test Company',
      displayName: 'Tester',
      isEmailVerified: true,
    });
    expect(loginIdSchema.safeParse(PUBLIC_DEMO.loginId).success).toBe(true);
    expect(passwordSchema.safeParse(PUBLIC_DEMO.password).success).toBe(true);
  });

  it('모든 항목이 시연 회사 소속이고 다른 샘플 회사의 데이터가 섞이지 않는다', () => {
    const items = [
      ...dataset.employees,
      ...dataset.partners,
      ...dataset.projects,
      ...dataset.assignments,
      ...dataset.workLogs,
      ...dataset.changeWorks,
      ...dataset.warranties,
      ...dataset.credentials,
      ...dataset.requiredCredentials,
      ...dataset.repairs,
      ...dataset.payRates,
      ...dataset.progress,
    ];

    expect(items.length).toBeGreaterThan(30);
    expect(items.every((item) => item.companyId === PUBLIC_DEMO.companyId)).toBe(true);
  });

  it('프로젝트가 진행·예정·중단·완료·종료 상태를 모두 보여 준다', () => {
    expect(new Set(dataset.projects.map((project) => project.status))).toEqual(
      new Set(['IN_PROGRESS', 'PLANNED', 'SUSPENDED', 'COMPLETED', 'CLOSED']),
    );
  });

  it('투입·작업 기록이 가리키는 프로젝트와 직원이 모두 존재한다', () => {
    const codes = new Set(dataset.projects.map((project) => project.code));
    const names = new Set(dataset.employees.map((employee) => employee.name));

    for (const item of [
      ...dataset.assignments,
      ...dataset.workLogs,
      ...dataset.changeWorks,
      ...dataset.warranties,
      ...dataset.repairs,
      ...dataset.progress,
    ]) {
      expect(codes.has(item.projectCode)).toBe(true);
    }

    for (const item of dataset.assignments) expect(names.has(item.employeeName)).toBe(true);
    for (const item of dataset.payRates) expect(names.has(item.employeeName)).toBe(true);
  });

  it('식별자가 중복되지 않는다', () => {
    for (const items of [
      dataset.employees,
      dataset.partners,
      dataset.projects,
      dataset.assignments,
      dataset.workLogs,
    ]) {
      const ids = items.map((item) => item.id);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  describe('날짜를 오늘 기준으로 옮김', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayOf = (date: string) => Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;
    const latestLog = (data: typeof dataset) =>
      Math.max(...data.workLogs.map((log) => dayOf(log.workDate)));
    // 한국 시간 2027-03-10 00:30은 UTC로는 전날이라 한국 날짜 기준으로 옮기는지도 함께 확인
    const now = new Date('2027-03-09T15:30:00.000Z');
    const today = dayOf('2027-03-10');

    it('가장 최근 작업 일지가 오늘(한국 시간) 이전 일주일 안에 온다', () => {
      const shifted = buildPublicDemoDataset(now);

      expect(latestLog(shifted)).toBeLessThanOrEqual(today);
      expect(today - latestLog(shifted)).toBeLessThan(7);
    });

    it('7의 배수 일수로 옮겨 요일 배치와 날짜 사이의 간격을 유지한다', () => {
      const shifted = buildPublicDemoDataset(now);
      const offset = latestLog(shifted) - latestLog(dataset);

      expect(offset % 7).toBe(0);
      shifted.workLogs.forEach((log, index) => {
        expect(dayOf(log.workDate) - dayOf(dataset.workLogs[index]!.workDate)).toBe(offset);
      });
      shifted.projects.forEach((project, index) => {
        const original = dataset.projects[index]!;

        expect(dayOf(project.plannedEnd) - dayOf(project.plannedStart)).toBe(
          dayOf(original.plannedEnd) - dayOf(original.plannedStart),
        );
      });
    });

    it('생년월일은 옮기지 않는다', () => {
      const shifted = buildPublicDemoDataset(now);

      expect(shifted.employees.map((employee) => employee.birthDate)).toEqual(
        dataset.employees.map((employee) => employee.birthDate),
      );
    });
  });

  it('내보내도 문제없는 가상 데이터만 담는다 (이메일은 시연 계정뿐, 연락처는 쓰이지 않는 번호)', () => {
    const text = JSON.stringify(dataset);
    const emails = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];

    expect(new Set(emails)).toEqual(new Set([PUBLIC_DEMO.email]));

    const mobiles = text.match(/01\d-\d{3,4}-\d{4}/g) ?? [];

    expect(mobiles.length).toBeGreaterThan(0);
    expect(mobiles.every((number) => /^01\d-0000-\d{4}$/.test(number))).toBe(true);
  });
});
