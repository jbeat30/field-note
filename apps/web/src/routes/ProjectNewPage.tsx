import { BackLink } from '../components/ui/back-link';
import { Card } from '../components/ui/card';
import { PageHeader } from '../components/ui/page-header';
import { ProjectForm } from '../projects/ProjectForm';

// 프로젝트 등록: 코드는 저장할 때 자동으로 붙음 (예: 2026-012)
export const ProjectNewPage = () => (
  <div className="flex flex-col gap-4">
    <PageHeader
      back={<BackLink to="/projects">프로젝트 목록</BackLink>}
      title="프로젝트 등록"
      description="프로젝트명, 현장 이름, 고객, 담당자, 계약일, 시작·종료 예정일만 입력하면 등록할 수 있습니다"
    />
    <Card className="flex flex-col gap-4 p-6 md:p-8">
      <p className="text-sm text-sub">
        프로젝트 코드는 저장할 때 자동으로 붙고 나중에 바꿀 수 없습니다. 상태는 &apos;예정&apos;으로
        시작합니다
      </p>
      <ProjectForm />
    </Card>
  </div>
);
