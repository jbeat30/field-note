import { Link } from 'react-router';

export const NotFoundPage = () => (
  <section>
    <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.025em]">
      페이지를 찾을 수 없습니다
    </h1>
    <Link className="mt-4 inline-flex min-h-touch items-center font-bold hover:text-sub" to="/">
      처음으로
    </Link>
  </section>
);
