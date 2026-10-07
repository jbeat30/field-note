import {
  PARTNER_KINDS,
  PARTNER_KIND_HINTS,
  PARTNER_KIND_LABELS,
  partnerNameSchema,
  type PartnerKind,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { splitServerErrors } from '../lib/serverErrors';

import { useCreatePartner } from './usePartners';

// 간편 등록: 구분과 상호만 넣으면 된다. 담당자·연락처·메모는 카드에서 나중에 채운다
export const PartnerQuickAdd = () => {
  const create = useCreatePartner();
  const [kind, setKind] = useState<PartnerKind>('CLIENT');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved('');

    const parsed = partnerNameSchema.safeParse(name);

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? '');
      return;
    }

    setMessage('');
    create.mutate(
      { kind, name: parsed.data },
      {
        // 같은 구분을 이어서 등록하는 경우가 많아 구분은 그대로 두고 상호만 비움
        onSuccess: (partner) => {
          setName('');
          setSaved(`${partner.name} 등록했습니다`);
        },
        onError: (error) => {
          const { byField, root } = splitServerErrors(error, ['name']);

          setMessage(root || byField.name || '');
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
        <Select
          aria-label="구분"
          value={kind}
          onChange={(event) => setKind(event.target.value as PartnerKind)}
        >
          {PARTNER_KINDS.map((item) => (
            <option key={item} value={item}>
              {PARTNER_KIND_LABELS[item]} ({PARTNER_KIND_HINTS[item]})
            </option>
          ))}
        </Select>
        <Input
          aria-label="상호"
          placeholder="상호"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" className="shrink-0 whitespace-nowrap" disabled={create.isPending}>
          등록
        </Button>
      </div>
    </form>
  );
};
