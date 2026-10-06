import { Navigate, Outlet } from 'react-router';

import { useMe } from './useMe';

// 로그인한 사용자만 통과. 이메일 인증 전이면 인증 화면으로 보냄 (인증이 끝나야 가입 완료)
export const RequireAuth = () => {
  const me = useMe();

  if (me.isPending) {
    return <p className="p-4 text-sm">확인 중</p>;
  }

  if (me.isError) {
    return <p className="p-4 text-sm text-danger">서버에 연결할 수 없습니다</p>;
  }

  if (!me.data) {
    return <Navigate to="/login" replace />;
  }

  if (!me.data.isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
};
