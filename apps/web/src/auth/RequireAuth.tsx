import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigation } from 'react-router';

import { Button } from '../components/ui/button';

import { useMe } from './useMe';

// 로그인한 사용자만 통과, 이메일 인증 전이면 인증 화면으로 이동 (인증이 끝나야 가입 완료)
export const RequireAuth = () => {
  const me = useMe();
  const location = useLocation();
  const navigation = useNavigation();
  // 화면을 쓰던 중에 로그인 정보가 사라졌는지(세션 만료) 구분하기 위해 한 번이라도 로그인 상태였는지 기억
  const [wasSignedIn, setWasSignedIn] = useState(false);

  if (me.data && !wasSignedIn) {
    setWasSignedIn(true);
  }

  if (me.isPending) {
    return <p className="p-4 text-sm">확인 중</p>;
  }

  if (me.isError && !me.data) {
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <p className="text-sm text-danger">
          {navigator.onLine
            ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요'
            : '인터넷에 연결되어 있지 않습니다. 연결을 확인한 뒤 다시 시도해 주세요'}
        </p>
        <Button type="button" onClick={() => void me.refetch()} disabled={me.isFetching}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!me.data) {
    // 로그인한 뒤 원래 보던 화면으로 돌아올 수 있게 경로를 라우터 상태로 넘김 (주소에 싣지 않으므로 외부 링크로는 지정할 수 없음)
    // 다른 화면으로 이동하는 중이었다면 그 화면을 기억 (로그인 화면으로 가는 중인 이동 자신은 제외)
    const pending = navigation.location;
    const target = pending && pending.pathname !== '/login' ? pending : location;

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${target.pathname}${target.search}`, expired: wasSignedIn }}
      />
    );
  }

  if (!me.data.isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
};
