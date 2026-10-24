import { Link, Outlet } from 'react-router';

import { BrandLogo } from './BrandLogo';

// 인력 배치표를 흉내 낸 장식 줄 (이름, 14칸 중 칸 수와 종류만 있고 실제 데이터는 아님)
// empty 빈 칸(회색 테두리), today 오늘(주황 테두리), work 투입, rest 쉬는 날, plan 예정
type Kind = 'empty' | 'today' | 'work' | 'rest' | 'plan';

const SAMPLE_ROWS: { name: string; cells: [Kind, number][] }[] = [
  {
    name: '홍길동',
    cells: [
      ['empty', 1],
      ['work', 5],
      ['today', 1],
      ['plan', 2],
      ['empty', 1],
      ['plan', 4],
    ],
  },
  {
    name: '홍길순',
    cells: [
      ['empty', 1],
      ['work', 2],
      ['rest', 1],
      ['work', 2],
      ['today', 1],
      ['plan', 2],
      ['empty', 1],
      ['plan', 4],
    ],
  },
  {
    name: '김철수',
    cells: [
      ['empty', 1],
      ['work', 5],
      ['today', 1],
      ['plan', 2],
      ['empty', 1],
      ['plan', 4],
    ],
  },
  {
    name: '김영희',
    cells: [
      ['empty', 2],
      ['work', 2],
      ['empty', 1],
      ['work', 1],
      ['empty', 1],
      ['today', 1],
      ['plan', 3],
      ['empty', 1],
      ['plan', 2],
    ],
  },
];

const CELL_CLASS: Record<Kind, string> = {
  empty: 'border-2 border-[#3a3228]',
  today: 'border-2 border-accent',
  work: 'border-2 border-accent bg-accent',
  rest: 'border-2 border-[#efe6d2] bg-[#efe6d2]',
  plan: 'border-2 border-[#4a4034] bg-[#4a4034]',
};

// 로그인·가입 등 로그인 전 화면 공통 틀: 주황 평면 + 아래쪽 잉크 띠 + 크림 폼 카드
// 넓은 화면은 소개 패널과 폼 카드를 한 화면에 담고(스크롤 없음), 좁은 화면은 위에서 아래로 쌓음
export const AuthLayout = () => (
  <div className="auth-light relative overflow-hidden bg-accent text-[#14110d] max-lg:min-h-dvh lg:h-dvh">
    {/* 잉크 띠: 좁은 화면은 위에서 고정 거리, 넓은 화면은 아래 3분의 1 */}
    <div
      aria-hidden
      className="absolute inset-x-0 top-[340px] bottom-0 bg-[#14110d] md:top-[520px] lg:top-[66.67%]"
    />
    <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 pt-9 pb-10 md:gap-7 md:px-14 md:pt-[52px] md:pb-12 lg:h-full lg:flex-row lg:items-stretch lg:justify-between lg:gap-10 lg:px-[clamp(48px,6.25vw,120px)] lg:py-0">
      <section className="flex flex-col gap-6 md:gap-7 lg:min-w-0 lg:flex-1 lg:gap-0 lg:pt-[clamp(28px,5.9vh,64px)] lg:pb-[clamp(28px,9.4vh,102px)]">
        <BrandLogo size="lg" />
        <h2 className="text-[38px] leading-[1.04] font-extrabold tracking-[-0.045em] break-keep md:text-[64px] lg:mt-[clamp(20px,4.6vh,50px)] lg:text-[clamp(44px,min(5.4vw,9.6vh),104px)]">
          현장 팀의 하루를
          <br />한 곳에서 <br className="md:hidden lg:inline" />
          관리하세요
        </h2>
        <div
          aria-hidden
          className="hidden max-w-[1120px] flex-col gap-3 rounded-[36px] bg-[#241d15] p-7 text-[#efe6d2] md:flex lg:mt-auto lg:gap-3.5 lg:px-10 lg:py-9 [@media(max-height:820px)]:lg:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-base font-semibold md:text-lg lg:text-xl">
              직원 투입과 인력 배치를 한눈에
            </span>
            <span className="rounded-full border border-accent px-4 py-[5px] text-[15px] font-bold whitespace-nowrap text-accent max-md:hidden">
              오늘 투입 4명, 기록 0명
            </span>
          </div>
          <div className="flex flex-col gap-2.5 lg:gap-3.5">
            {SAMPLE_ROWS.map((row) => (
              <div key={row.name} className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-[17px] font-semibold max-lg:hidden">
                  {row.name}
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-14 gap-1.5">
                  {row.cells.map(([kind, span], index) => (
                    <span
                      key={`${kind}${index}`}
                      style={{ gridColumn: `span ${span}` }}
                      className={`h-9 rounded-[14px] lg:h-[50px] ${CELL_CLASS[kind]}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="relative mx-auto flex w-full flex-col md:max-w-[712px] lg:mx-0 lg:w-[clamp(400px,25vw,480px)] lg:shrink-0 lg:justify-center lg:py-6">
        <main className="rounded-[36px] bg-surface p-[22px] text-foreground md:p-11 lg:max-h-full lg:overflow-y-auto lg:px-[38px] lg:py-9">
          <Outlet />
        </main>
        <nav
          aria-label="약관"
          className="mt-3 flex justify-center gap-5 text-[13px] font-semibold text-[#14110d]/90 lg:absolute lg:inset-x-0 lg:bottom-[clamp(12px,3vh,32px)] lg:mt-0 lg:justify-end"
        >
          <Link
            className="flex min-h-touch items-center transition-colors hover:text-[#14110d]"
            to="/legal/terms"
          >
            이용약관
          </Link>
          <Link
            className="flex min-h-touch items-center transition-colors hover:text-[#14110d]"
            to="/legal/privacy"
          >
            개인정보 처리방침
          </Link>
        </nav>
      </div>
    </div>
  </div>
);
