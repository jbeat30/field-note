import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { logout } from '../api/logout';

// 서버 세션 종료와 브라우저 상태 초기화 뒤 로그인 화면으로 이동하는 동작 (설정·프로필 메뉴가 같이 사용)
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async () => {
    await logout(queryClient);
    await navigate('/login', { replace: true });
  };
};
