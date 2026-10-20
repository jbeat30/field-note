// 공개 시연 회사: 가상 데이터만 담고 로그인 화면에 계정을 안내하는 공용 계정 (실사용 회사와 섞이지 않게 ID를 고정)
export const PUBLIC_DEMO = {
  companyId: '0198d000-0000-7000-8000-0000000000d1',
  userId: '0198d000-0000-7000-8000-0000000000d2',
  companyName: 'Test Company',
  displayName: 'Tester',
  loginId: 'tester',
  // 공개 비밀번호 (로그인 화면에 그대로 안내됨, 가상 데이터 전용이라 비밀이 아님)
  password: 'Visit-Demo-2026!',
  // 메일은 이 주소로 나가지 않도록 막힘 (demoMailer)
  email: 'jbeatfield@gmail.com',
} as const;

// 공용 계정이라 동시에 로그인한 방문자가 서로 밀려나지 않도록 계정당 세션 수 상한을 크게 둠
export const PUBLIC_DEMO_MAX_SESSIONS = 200;

export const isPublicDemoCompany = (companyId: string): boolean =>
  companyId === PUBLIC_DEMO.companyId;
