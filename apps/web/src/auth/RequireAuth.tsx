import { Navigate, Outlet, useLocation } from 'react-router';

import { useMe } from './useMe';

// 로그인한 사용자만 통과, 이메일 인증 전이면 인증 화면으로 이동 (인증이 끝나야 가입 완료)
export const RequireAuth = () => {
  const me = useMe();
  const { pathname, search } = useLocation();

  if (me.isPending) {
    return <p className="p-4 text-sm">확인 중</p>;
  }

  if (me.isError) {
    return <p className="p-4 text-sm text-danger">서버에 연결할 수 없습니다</p>;
  }

  if (!me.data) {
    // 로그인한 뒤 원래 보던 화면으로 돌아올 수 있게 경로를 라우터 상태로 넘김 (주소에 싣지 않으므로 외부 링크로는 지정할 수 없음)
    return <Navigate to="/login" replace state={{ from: `${pathname}${search}` }} />;
  }

  if (!me.data.isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
};
