import { Navigate, useSearchParams } from 'react-router';

import { projectWorkPath } from '../lib/projectPaths';

// 예전 주소(/work-logs?project=&date=)로 진입하면 프로젝트의 작업 내역 화면으로 이동, 작업은 프로젝트 안에서 처리
export const WorkLogRedirect = () => {
  const [params] = useSearchParams();
  const project = params.get('project');
  const date = params.get('date') ?? undefined;

  // 주소의 값은 식별자 글자(영문·숫자·하이픈)일 때만 경로에 넣음
  const isSafe = (value: string | null | undefined) => !value || /^[\w-]+$/.test(value);

  return (
    <Navigate
      to={project && isSafe(project) && isSafe(date) ? projectWorkPath(project, date) : '/projects'}
      replace
    />
  );
};
