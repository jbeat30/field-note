import { useMe } from '../auth/useMe';

// 로그인 후 첫 화면 (홈 대시보드는 1단계 이후)
export const HomePage = () => {
  const me = useMe();

  return (
    <section>
      <h1 className="text-2xl font-bold">{me.data?.companyName}</h1>
      <p className="mt-2 text-sm">{me.data?.displayName}님, 안녕하세요</p>
    </section>
  );
};
