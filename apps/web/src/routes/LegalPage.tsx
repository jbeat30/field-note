import { Link, useParams } from 'react-router';

const TITLES: Record<string, string> = {
  terms: '이용약관',
  privacy: '개인정보 수집·이용 동의',
  marketing: '마케팅 정보 수신 동의',
};

// 약관·처리방침 전문 자리 (실제 본문은 법률 검토 후 P0-9에서 등록)
export const LegalPage = () => {
  const { slug = '' } = useParams();

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">{TITLES[slug] ?? '문서'}</h1>
      <p className="text-sm">
        초안 준비 중입니다. 정식 본문은 공개 전에 전문가 검토를 거쳐 등록합니다
      </p>
      <Link className="min-h-touch content-center text-primary underline" to="/login">
        로그인 화면으로
      </Link>
    </section>
  );
};
