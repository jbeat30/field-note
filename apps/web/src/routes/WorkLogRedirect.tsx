import { Navigate, useSearchParams } from 'react-router';

import { projectWorkPath } from '../lib/projectPaths';

// 예전 주소(/work-logs?project=&date=)로 진입하면 프로젝트의 작업 내역 화면으로 이동, 작업은 프로젝트 안에서 처리
export const WorkLogRedirect = () => {
  const [params] = useSearchParams();
  const project = params.get('project');
  const date = params.get('date') ?? undefined;

  return <Navigate to={project ? projectWorkPath(project, date) : '/projects'} replace />;
};
