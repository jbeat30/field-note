import { employeeNameSchema } from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useOptions } from '../settings/useOptions';

import { splitServerErrors } from './errors';
import { OptionSelect } from './OptionSelect';
import { useCreateEmployee } from './useEmployees';

// 간편 등록: 이름과 직종만 넣으면 된다 (일용·협력 인력용). 나머지는 직원 카드에서 나중에 채운다
export const EmployeeQuickAdd = () => {
  const options = useOptions();
  const create = useCreateEmployee();
  const [name, setName] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved('');

    const parsed = employeeNameSchema.safeParse(name);

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? '');
      return;
    }

    setMessage('');
    create.mutate(
      { name: parsed.data, jobTypeId: jobTypeId || null },
      {
        // 같은 직종을 이어서 등록하는 경우가 많아 직종은 그대로 두고 이름만 비움
        onSuccess: (employee) => {
          setName('');
          setSaved(`${employee.name} 등록했습니다`);
        },
        onError: (error) => {
          const { byField, root } = splitServerErrors(error, ['jobTypeId', 'name']);

          setMessage(root || Object.values(byField)[0] || '');
        },
      },
    );
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={submit}
      noValidate
    >
      <h2 className="text-base font-bold">간편 등록</h2>
      {message && <Alert>{message}</Alert>}
      {saved && <Alert variant="info">{saved}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="이름"
          placeholder="이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <OptionSelect
          aria-label="직종"
          kind="JOB_TYPE"
          options={options.data ?? []}
          value={jobTypeId}
          emptyLabel="직종 선택 안 함"
          onChange={(event) => setJobTypeId(event.target.value)}
        />
        <Button type="submit" className="shrink-0 whitespace-nowrap" disabled={create.isPending}>
          등록
        </Button>
      </div>
    </form>
  );
};
