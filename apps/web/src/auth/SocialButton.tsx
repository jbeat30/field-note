import { SOCIAL_PROVIDER_LABELS, type SocialProviderKey } from '@field-note/shared';
import type { ComponentProps } from 'react';

import { cn } from '../lib/cn';

// 제공자 브랜드 색: 카카오(노란 배경), 네이버(초록 배경, 명암비를 위해 어두운 글자), 구글(흰 배경 + 테두리), 터치 영역 최소 44px
const BRAND_STYLES: Record<SocialProviderKey, string> = {
  kakao: 'bg-[#fee500] text-[#191919] hover:bg-[#f0d800] focus-visible:outline-[#191919]',
  naver: 'bg-[#03c75a] text-[#191919] hover:bg-[#02b350] focus-visible:outline-[#191919]',
  google:
    'border border-[#dadce0] bg-white text-[#1f1f1f] hover:bg-[#f2f2f2] focus-visible:outline-[#1f1f1f]',
};

type SocialButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  provider: SocialProviderKey;
  // 버튼 문구의 동작 (예: 로그인, 가입)
  action: string;
};

export const SocialButton = ({ provider, action, className, ...props }: SocialButtonProps) => (
  <button
    type="button"
    className={cn(
      'inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
      BRAND_STYLES[provider],
      className,
    )}
    {...props}
  >
    {SOCIAL_PROVIDER_LABELS[provider]}로 {action}
  </button>
);
