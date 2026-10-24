import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

// 홈 머리의 통합 검색: 크림 알약 안에 돋보기, 입력, 잉크 찾기 버튼 (검색 결과 화면으로 이동)
export const HeaderSearch = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');

  return (
    <form
      role="search"
      className="flex h-14 w-full items-center gap-2.5 rounded-full border-2 border-[#14110d] bg-surface-subtle pr-1 pl-5 focus-within:bg-surface md:w-[360px]"
      onSubmit={(event) => {
        event.preventDefault();

        if (text.trim()) void navigate(`/search?q=${encodeURIComponent(text.trim())}`);
      }}
    >
      <Search aria-hidden className="size-[18px] shrink-0 text-sub" />
      <input
        type="search"
        aria-label="찾기"
        placeholder="프로젝트, 직원, 메모 찾기"
        maxLength={50}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-sub"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-full bg-[#14110d] px-5 text-sm font-bold text-[#fbf7ee] hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        찾기
      </button>
    </form>
  );
};
