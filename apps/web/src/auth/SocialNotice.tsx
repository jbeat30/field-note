import { useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';

import { parseSocialResult, SOCIAL_RESULT_MESSAGES } from './useSocial';

// 카카오 화면에서 돌아온 결과 안내 (주소의 ?social= 값)
export const SocialNotice = () => {
  const [params] = useSearchParams();
  const result = parseSocialResult(params.get('social'));

  if (!result) {
    return null;
  }

  const { text, tone } = SOCIAL_RESULT_MESSAGES[result];

  return <Alert variant={tone}>{text}</Alert>;
};
