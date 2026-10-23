import { Link, Outlet } from 'react-router';

import { BrandLogo } from './BrandLogo';

const FEATURES = [
  '직원 투입과 인력 배치를 한눈에',
  '하루 작업 내역을 3분 안에 입력',
  '사진·자재·문서를 프로젝트별로 정리',
];

// 인력 배치 모양을 흉내 낸 장식 막대 (칸 수, 색 순서만 있고 실제 데이터는 아님)
const SAMPLE_ROWS = [
  [
    { span: 5, className: 'bg-accent' },
    { span: 4, className: 'bg-highlight' },
  ],
  [
    { span: 3, className: 'bg-[#fbf7ee]' },
    { span: 6, className: 'bg-accent' },
  ],
  [
    { span: 7, className: 'bg-highlight' },
    { span: 3, className: 'border-2 border-[#fbf7ee]' },
  ],
];

// 로그인·가입 등 로그인 전 화면 공통 틀: 주황 평면 위에 소개와 크림 폼 카드를 겹침
// 넓은 화면은 소개 + 폼 카드, 좁은 화면은 로고 + 폼 카드만, 약관과 개인정보 처리방침은 하단에 둠
export const AuthLayout = () => (
  <div className="relative min-h-dvh overflow-hidden bg-accent text-[#14110d]">
    {/* 아래쪽 잉크 띠: 소개 패널이 주황과 잉크 경계에 걸침 */}
    <div aria-hidden className="absolute inset-x-0 bottom-0 hidden h-[34%] bg-[#14110d] md:block" />
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[1680px] flex-col gap-8 px-4 py-8 md:px-14 md:py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-20 lg:px-[120px]">
      <section className="flex flex-col gap-8 lg:justify-between lg:py-4">
        <BrandLogo size="lg" />
        <h2 className="hidden text-[clamp(52px,5.4vw,104px)] leading-[1.04] font-extrabold tracking-[-0.045em] break-keep md:block">
          현장 팀의 하루를
          <br />한 곳에서 관리하세요
        </h2>
        <div className="hidden flex-col gap-3.5 rounded-[36px] bg-[#241d15] p-7 text-[#efe6d2] md:flex lg:p-9">
          <p className="text-[15px] font-semibold lg:text-xl">{FEATURES[0]}</p>
          <div aria-hidden className="flex flex-col gap-2">
            {SAMPLE_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-10 gap-1.5">
                {row.map((segment) => (
                  <span
                    key={`${segment.span}${segment.className}`}
                    style={{ gridColumn: `span ${segment.span}` }}
                    className={`h-9 rounded-[11px] lg:h-[50px] lg:rounded-[14px] ${segment.className}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#efe6d2]/80">
            {FEATURES.slice(1).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-4 md:max-w-[560px] lg:max-w-none">
        <main className="rounded-[36px] bg-surface-subtle p-6 text-foreground md:p-10 lg:px-[38px] lg:py-9">
          <Outlet />
          <footer className="mt-6 flex justify-center gap-4 border-t border-line pt-3 text-sm font-semibold">
            <Link className="min-h-touch content-center underline" to="/legal/terms">
              이용약관
            </Link>
            <Link className="min-h-touch content-center underline" to="/legal/privacy">
              개인정보 처리방침
            </Link>
          </footer>
        </main>
      </div>
    </div>
  </div>
);
