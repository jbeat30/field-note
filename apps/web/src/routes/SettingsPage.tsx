import { Link, useSearchParams } from 'react-router';

import { useMe } from '../auth/useMe';
import { Alert } from '../components/ui/alert';
import { Button, pillButtonClass } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { useLogout } from '../layouts/useLogout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ClosureSection } from '../settings/ClosureSection';
import { DataExportSection } from '../settings/DataExportSection';
import { StorageSection } from '../settings/StorageSection';
import { SocialLoginSection } from '../settings/SocialLoginSection';
import { CompanyRulesForm } from '../settings/CompanyRulesForm';
import { CompanySettingsForm } from '../settings/CompanySettingsForm';
import { DevicesSection } from '../settings/DevicesSection';
import { SecurityRows } from '../settings/SecurityRows';

const SETTINGS_TABS = [
  { value: 'account', label: '내 계정' },
  { value: 'company', label: '회사 관리' },
  { value: 'etc', label: '기타' },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]['value'];

// 탭마다 평면 안 탭 아래에 보이는 한 줄 안내
const TAB_NOTES: Record<string, string> = {
  account: '로그인과 보안에 관한 설정',
  company: '회사 단위 설정과 기록',
  etc: '약관과 계정 해지',
};

export const SettingsPage = () => {
  const me = useMe();
  // 공개 시연 계정은 로그인 정보 변경·2단계 인증·소셜 연동·기기 관리·해지를 쓸 수 없음 (서버도 막고 있어 화면에서 숨김)
  const isDemo = me.data?.isDemo === true;
  const [searchParams, setSearchParams] = useSearchParams();
  // 선택한 탭은 주소(?tab=)에 담아 새로고침·뒤로 가기에서도 유지
  const requestedTab = searchParams.get('tab');
  const tab: SettingsTab =
    SETTINGS_TABS.find((item) => item.value === requestedTab)?.value ?? 'account';
  const changeTab = (value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        next.set('tab', value);
        return next;
      },
      { replace: true },
    );

  const onLogout = useLogout();

  return (
    <Tabs value={tab} onValueChange={changeTab} className="flex flex-col gap-4">
      <PageHeader
        title="설정"
        description="계정과 회사 운영에 필요한 설정을 관리합니다"
        actions={
          <button type="button" className={pillButtonClass} onClick={onLogout}>
            로그아웃
          </button>
        }
        tabs={
          <div className="flex flex-col gap-3">
            <TabsList aria-label="설정 구분">
              {SETTINGS_TABS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <p className="text-sm font-medium">{TAB_NOTES[tab]}</p>
          </div>
        }
      />
      <TabsContent value="account" className="pt-0">
        {isDemo && (
          <Alert variant="info" className="mb-4">
            시연용 계정이라 비밀번호·이메일 변경, 2단계 인증, 소셜 로그인 연동, 로그인한 기기 관리,
            계정 해지는 제공하지 않습니다
          </Alert>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="account-heading"
            >
              <h2 id="account-heading" className="text-lg font-bold">
                계정
              </h2>
              <dl className="grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
                <dt className="text-foreground/70">회사</dt>
                <dd>{me.data?.companyName}</dd>
                <dt className="text-foreground/70">이름</dt>
                <dd>{me.data?.displayName}</dd>
              </dl>
            </section>
            {!isDemo && (
              <>
                <section
                  className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
                  aria-labelledby="security-heading"
                >
                  <h2 id="security-heading" className="text-lg font-bold">
                    보안
                  </h2>
                  <SecurityRows email={me.data?.email} />
                </section>
                <section
                  className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
                  aria-labelledby="social-heading"
                >
                  <h2 id="social-heading" className="text-lg font-bold">
                    소셜 로그인
                  </h2>
                  <SocialLoginSection />
                </section>
              </>
            )}
          </div>
          {!isDemo && (
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="devices-heading"
            >
              <h2 id="devices-heading" className="text-lg font-bold">
                로그인한 기기
              </h2>
              <DevicesSection />
            </section>
          )}
        </div>
      </TabsContent>
      <TabsContent value="company" className="pt-0">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="company-heading" className="flex flex-col gap-3">
            <h2 id="company-heading" className="text-lg font-bold">
              기준값
            </h2>
            <CompanySettingsForm />
          </section>
          <section aria-labelledby="rules-heading" className="flex flex-col gap-3">
            <h2 id="rules-heading" className="text-lg font-bold">
              경고·보증 기준
            </h2>
            <CompanyRulesForm />
          </section>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="storage-heading"
            >
              <h2 id="storage-heading" className="text-lg font-bold">
                저장 용량
              </h2>
              <StorageSection />
            </section>
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="export-heading"
            >
              <h2 id="export-heading" className="text-lg font-bold">
                데이터 내보내기
              </h2>
              <DataExportSection />
            </section>
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="lists-heading"
            >
              <h2 id="lists-heading" className="text-lg font-bold">
                목록 관리
              </h2>
              <p className="text-sm text-foreground/70">
                직종, 작업 구분, 공종, 직원 구분을 회사에 맞게 바꿉니다
              </p>
              <Button variant="secondary" asChild>
                <Link to="/settings/lists">목록 관리 열기</Link>
              </Button>
            </section>
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="alerts-heading"
            >
              <h2 id="alerts-heading" className="text-lg font-bold">
                알림
              </h2>
              <p className="text-sm text-foreground/70">
                대시보드에 보여 줄 알림(작업 내역 미입력, 공수 소진, 일정 지연 등)을 종류별로 켜고
                끕니다
              </p>
              <Button variant="secondary" asChild>
                <Link to="/settings/alerts">알림 설정 열기</Link>
              </Button>
            </section>
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="records-heading"
            >
              <h2 id="records-heading" className="text-lg font-bold">
                활동 기록
              </h2>
              <p className="text-sm text-foreground/70">
                저장·수정·삭제한 일, 내보내기, 월 공수 확정·재오픈, 민감 자료·직원 서류 열람 기록을
                봅니다 (조회만 가능하고 수정·삭제할 수 없습니다)
              </p>
              <Button variant="secondary" asChild>
                <Link to="/settings/records">활동 기록 열기</Link>
              </Button>
            </section>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="etc" className="pt-0">
        <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {!isDemo && (
            <section
              className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5"
              aria-labelledby="closure-heading"
            >
              <h2 id="closure-heading" className="text-lg font-bold">
                계정 해지
              </h2>
              <ClosureSection />
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-3xl bg-surface-subtle p-5">
            <p className="text-lg font-bold">안내</p>
            <Link
              className="flex min-h-touch items-center text-sm text-primary underline"
              to="/legal/privacy"
            >
              개인정보 처리방침
            </Link>
          </section>
        </div>
      </TabsContent>
    </Tabs>
  );
};
