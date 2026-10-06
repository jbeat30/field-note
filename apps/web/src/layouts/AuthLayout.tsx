import { APP_NAME } from '@field-note/shared';
import { Link, Outlet } from 'react-router';

// 로그인·가입 등 로그인 전 화면 공통 틀 (모바일 우선 단일 컬럼)
// 약관과 개인정보 처리방침은 어느 화면에서나 볼 수 있게 하단에 둠 (서비스 기획서 §5.7)
export const AuthLayout = () => (
  <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
    <p className="text-center text-lg font-bold text-primary">{APP_NAME}</p>
    <main>
      <Outlet />
    </main>
    <footer className="flex justify-center gap-4 text-sm">
      <Link className="min-h-touch content-center text-foreground/70 underline" to="/legal/terms">
        이용약관
      </Link>
      <Link className="min-h-touch content-center text-foreground/70 underline" to="/legal/privacy">
        개인정보 처리방침
      </Link>
    </footer>
  </div>
);
