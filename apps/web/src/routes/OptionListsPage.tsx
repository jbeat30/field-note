import { OPTION_KINDS, OPTION_KIND_LABELS, type OptionKind } from '@field-note/shared';
import { useSearchParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { BackLink } from '../components/ui/back-link';
import { PageHeader } from '../components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { OptionListSection } from '../settings/OptionListSection';
import { useOptions } from '../settings/useOptions';

// 설정 > 목록 관리: 직종·작업 구분·공종·직원 구분·자격 종류를 회사가 정한다 (서비스 기획서 §8.3, §9.2, §10.2)
// 종류별 탭으로 구분, 선택한 종류는 주소(?kind=)에 보관
export const OptionListsPage = () => {
  const options = useOptions();
  const [params, setParams] = useSearchParams();
  const requested = params.get('kind');
  const kind: OptionKind = OPTION_KINDS.find((item) => item === requested) ?? OPTION_KINDS[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink to="/settings?tab=company">설정으로</BackLink>
        <PageHeader
          title="목록 관리"
          description="입력할 때 고르는 목록을 회사에 맞게 바꿉니다. 쓰지 않는 항목은 삭제하지 않고 숨기며, 숨겨도 이미 기록된 이름은 그대로 남습니다"
        />
      </div>
      {options.isPending && <p className="text-sm">목록을 불러오는 중</p>}
      {options.isError && <Alert>목록을 불러오지 못했습니다</Alert>}
      {options.data && (
        <Tabs value={kind} onValueChange={(value) => setParams({ kind: value }, { replace: true })}>
          <TabsList aria-label="목록 종류">
            {OPTION_KINDS.map((item) => (
              <TabsTrigger key={item} value={item}>
                {OPTION_KIND_LABELS[item]}
              </TabsTrigger>
            ))}
          </TabsList>
          {OPTION_KINDS.map((item) => (
            <TabsContent key={item} value={item}>
              <OptionListSection
                kind={item}
                items={options.data.filter((option) => option.kind === item)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
