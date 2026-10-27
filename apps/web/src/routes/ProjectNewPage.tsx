import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { ProjectForm } from '../projects/ProjectForm';

// 프로젝트 등록: 코드는 저장할 때 자동으로 붙음 (예: 2026-012), 상태는 '예정'으로 시작
export const ProjectNewPage = () => (
  <div className="flex flex-col gap-6">
    <PageHeader
      overlap
      back={<BackLink to="/projects">프로젝트 목록</BackLink>}
      eyebrow={
        <span className="font-emphasis">새 프로젝트 · 코드는 저장할 때 자동으로 붙어요</span>
      }
      title="프로젝트 등록"
    />
    <div className="relative -mt-14 flex flex-col gap-4 md:-mt-16">
      <ProjectForm />
    </div>
  </div>
);
