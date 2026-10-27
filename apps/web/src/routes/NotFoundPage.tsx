import { Link, useNavigate } from 'react-router';

// 없는 주소: 잉크 카드에 큰 404, 대시보드로 가거나 이전 화면으로 돌아감
export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col items-start gap-3.5 rounded-[34px] bg-[#14110d] p-8 text-[#fcf9f2] md:p-12">
      <span
        aria-hidden
        className="font-emphasis text-[88px] leading-none font-bold tracking-[-0.04em] text-accent md:text-[120px]"
      >
        404
      </span>
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">찾는 페이지가 없어요</h1>
      <p className="text-[15px] leading-[1.65] font-medium text-[#d9d0bc]">
        주소가 바뀌었거나 삭제된 페이지일 수 있어요. 대시보드에서 다시 찾아보세요.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        <Link
          to="/"
          className="inline-flex h-[52px] items-center rounded-[18px] bg-highlight px-6 text-[15px] font-bold text-[#14110d] hover:opacity-85"
        >
          대시보드로
        </Link>
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="inline-flex h-[52px] items-center rounded-[18px] bg-[#2a251d] px-6 text-[15px] font-bold text-[#f4eee0] hover:bg-[#3a342b]"
        >
          이전 화면
        </button>
      </div>
    </section>
  );
};
