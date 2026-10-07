import { OPTION_KINDS } from '@field-note/shared';
import { Link } from 'react-router';

import { Alert } from '../components/ui/alert';
import { OptionListSection } from '../settings/OptionListSection';
import { useOptions } from '../settings/useOptions';

// 설정 > 목록 관리: 직종·작업 구분·공종·직원 구분을 회사가 정한다 (서비스 기획서 §8.3, §9.2, §10.2)
export const OptionListsPage = () => {
  const options = useOptions();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link className="min-h-touch content-center text-sm text-primary underline" to="/settings">
          ← 설정으로
        </Link>
        <h1 className="text-2xl font-bold">목록 관리</h1>
        <p className="text-sm text-foreground/70">
          입력할 때 고르는 목록을 회사에 맞게 바꿉니다. 쓰지 않는 항목은 삭제하지 않고 숨기며,
          숨겨도 이미 기록된 이름은 그대로 남습니다
        </p>
      </div>
      {options.isPending && <p className="text-sm">목록을 불러오는 중</p>}
      {options.isError && <Alert>목록을 불러오지 못했습니다</Alert>}
      {options.data &&
        OPTION_KINDS.map((kind) => (
          <OptionListSection
            key={kind}
            kind={kind}
            items={options.data.filter((item) => item.kind === kind)}
          />
        ))}
    </div>
  );
};
