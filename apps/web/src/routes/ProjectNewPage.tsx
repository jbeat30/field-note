import { BackLink } from '../components/ui/back-link';
import { ProjectForm } from '../projects/ProjectForm';

// 프로젝트 등록: 코드는 저장할 때 자동으로 붙는다 (예: 2026-012)
export const ProjectNewPage = () => (
  <div className="flex flex-col gap-4">
    <BackLink to="/projects">프로젝트 목록</BackLink>
    <h1 className="text-2xl font-bold">프로젝트 등록</h1>
    <p className="text-sm text-foreground/70">
      프로젝트 코드는 저장할 때 자동으로 붙고 나중에 바꿀 수 없습니다. 상태는 &apos;예정&apos;으로
      시작합니다
    </p>
    <ProjectForm />
  </div>
);
