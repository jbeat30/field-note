import { APP_NAME } from '@field-note/shared';
import { ClipboardList, HardHat, Images } from 'lucide-react';
import { Link, Outlet } from 'react-router';

const FEATURES = [
  { icon: HardHat, text: '직원 투입과 인력 배치를 한눈에' },
  { icon: ClipboardList, text: '하루 작업 내역을 3분 안에 입력' },
  { icon: Images, text: '사진·자재·문서를 프로젝트별로 정리' },
];

// 로그인·가입 등 로그인 전 화면 공통 틀, 넓은 화면은 소개 패널 + 폼, 좁은 화면은 폼만 (모바일 우선 단일 컬럼)
// 약관과 개인정보 처리방침은 어느 화면에서나 볼 수 있게 하단에 둠
export const AuthLayout = () => (
  <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
      <p className="font-emphasis text-2xl font-bold">{APP_NAME}</p>
      <div className="flex flex-col gap-8">
        <h2 className="text-4xl leading-tight font-bold tracking-tight break-keep">
          현장 팀의 하루를
          <br />한 곳에서 관리하세요
        </h2>
        <ul className="flex flex-col gap-4">
          {FEATURES.map((feature) => (
            <li key={feature.text} className="flex items-center gap-3 text-lg">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
                <feature.icon aria-hidden className="size-5" />
              </span>
              {feature.text}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm">현장 팀 프로젝트 관리 서비스</p>
    </aside>
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8 lg:max-w-lg lg:px-8">
      <header className="text-center lg:hidden">
        <p className="font-emphasis text-3xl font-bold text-primary">{APP_NAME}</p>
        <p className="mt-1 text-sm text-foreground/70">현장 팀 프로젝트 관리</p>
      </header>
      <main className="rounded-xl bg-surface-subtle p-6 lg:p-8">
        <Outlet />
      </main>
      <footer className="flex justify-center gap-4 text-sm">
        <Link className="min-h-touch content-center text-foreground/70 underline" to="/legal/terms">
          이용약관
        </Link>
        <Link
          className="min-h-touch content-center text-foreground/70 underline"
          to="/legal/privacy"
        >
          개인정보 처리방침
        </Link>
      </footer>
    </div>
  </div>
);
