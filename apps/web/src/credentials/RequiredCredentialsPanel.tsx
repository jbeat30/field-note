import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { getErrorDetailMessage } from '../lib/apiError';
import { useOptions } from '../settings/useOptions';

import { useRequiredCredentials, useSaveRequiredCredentials } from './useCredentials';

const Editor = ({
  projectId,
  saved,
}: {
  projectId: string;
  saved: { typeId: string; typeName: string }[];
}) => {
  const options = useOptions();
  const save = useSaveRequiredCredentials(projectId);
  const [selected, setSelected] = useState<string[]>(saved.map((item) => item.typeId));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // 숨긴 종류여도 이미 지정한 것은 계속 표시
  const savedIds = new Set(saved.map((item) => item.typeId));
  const choices = (options.data ?? []).filter(
    (item) => item.kind === 'CREDENTIAL_TYPE' && (item.isActive || savedIds.has(item.id)),
  );
  const dirty =
    selected.length !== saved.length || selected.some((typeId) => !savedIds.has(typeId));

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="info">{message}</Alert>}
      {choices.length === 0 ? (
        <p className="text-sm text-foreground/70">설정에서 자격 종류를 먼저 등록해 주세요</p>
      ) : (
        <ul className="flex flex-col">
          {choices.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-touch items-center gap-3 text-base">
                <Checkbox
                  checked={selected.includes(item.id)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked === true
                        ? [...current, item.id]
                        : current.filter((typeId) => typeId !== item.id),
                    )
                  }
                />
                {item.name}
                {item.isActive ? '' : ' (숨김)'}
              </label>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        disabled={!dirty || save.isPending}
        onClick={() => {
          setError('');
          setMessage('');
          save
            .mutateAsync(selected)
            .then(() => setMessage('필요 자격을 저장했습니다'))
            .catch((caught: unknown) => setError(getErrorDetailMessage(caught)));
        }}
      >
        {save.isPending ? '저장 중' : '필요 자격 저장'}
      </Button>
    </div>
  );
};

// 프로젝트의 필요 자격: 정해 두면 투입 배정 때 자격이 없거나 만료된 직원을 경고한다 (서비스 기획서 §8.4)
export const RequiredCredentialsPanel = ({ projectId }: { projectId: string }) => {
  const required = useRequiredCredentials(projectId);
  const options = useOptions();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="required-credentials-heading">
      <h2 id="required-credentials-heading" className="text-lg font-bold">
        필요 자격
      </h2>
      <p className="text-sm text-foreground/70">
        정해 두면 투입할 때 서류가 없거나 만료된 직원을 경고합니다 (투입은 막지 않습니다)
      </p>
      {required.isPending || options.isPending ? (
        <p className="text-sm">필요 자격을 불러오는 중</p>
      ) : required.isError || options.isError ? (
        <Alert>필요 자격을 불러오지 못했습니다</Alert>
      ) : (
        <Editor projectId={projectId} saved={required.data} />
      )}
    </section>
  );
};
