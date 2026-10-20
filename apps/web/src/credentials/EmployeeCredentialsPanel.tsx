import {
  CREDENTIAL_MEMO_MAX_LENGTH,
  CREDENTIAL_STATUS_LABELS,
  credentialCreateSchema,
  credentialUpdateSchema,
  type EmployeeCredential,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { DateInput } from '../components/ui/date-input';
import { getErrorDetailMessage } from '../lib/apiError';
import { isHttpUrl } from '../lib/safeReturnPath';
import { splitServerErrors } from '../lib/serverErrors';
import { OptionSelect } from '../employees/OptionSelect';
import { useOptions } from '../settings/useOptions';

import {
  EMPLOYEE_DOCUMENT_ACCEPT,
  fetchCredentialFileUrl,
  uploadEmployeeDocument,
  useCreateCredential,
  useCredentials,
  useRemoveCredential,
  useUpdateCredential,
} from './useCredentials';

const FIELDS = ['typeId', 'issuedOn', 'expiresOn', 'fileId', 'memo'] as const;

const STATUS_STYLE = {
  VALID: 'bg-muted',
  EXPIRING: 'border border-primary text-primary',
  EXPIRED: 'border border-danger text-danger',
} as const;

const daysText = (daysLeft: number | null) =>
  daysLeft === null
    ? '만료 없음'
    : daysLeft < 0
      ? `${-daysLeft}일 지남`
      : daysLeft === 0
        ? '오늘 만료'
        : `${daysLeft}일 남음`;

// 새 창은 클릭과 같은 순간에 열고 주소를 받으면 이동시킴 (비동기 뒤에 열면 모바일 브라우저가 차단)
const openFile = async (employeeId: string, credentialId: string, onError: (m: string) => void) => {
  const popup = window.open('', '_blank');

  try {
    const { url } = await fetchCredentialFileUrl(employeeId, credentialId);

    if (!isHttpUrl(url)) {
      throw new Error('[web.EmployeeCredentialsPanel] 열 수 없는 주소');
    }

    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (caught) {
    popup?.close();
    onError(getErrorDetailMessage(caught));
  }
};

const CredentialRow = ({
  employeeId,
  credential,
  onError,
}: {
  employeeId: string;
  credential: EmployeeCredential;
  onError: (message: string) => void;
}) => {
  const update = useUpdateCredential(employeeId);
  const remove = useRemoveCredential(employeeId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [issuedOn, setIssuedOn] = useState(credential.issuedOn ?? '');
  const [expiresOn, setExpiresOn] = useState(credential.expiresOn ?? '');
  const [memo, setMemo] = useState(credential.memo ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async () => {
    setErrors({});
    onError('');

    const body = {
      issuedOn: issuedOn || null,
      expiresOn: expiresOn || null,
      memo: memo.trim() || null,
    };
    const parsed = credentialUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    setBusy(true);

    try {
      const fileId = file ? await uploadEmployeeDocument(employeeId, file) : undefined;

      await update.mutateAsync({
        credentialId: credential.id,
        body: { ...parsed.data, ...(fileId ? { fileId } : {}) },
      });
      setEditing(false);
      setFile(null);
    } catch (caught) {
      const { byField, root } = splitServerErrors(caught, FIELDS);

      setErrors(byField);
      onError(root || (Object.keys(byField).length === 0 ? getErrorDetailMessage(caught) : ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4 text-sm">
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {credential.typeName}
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-normal ${STATUS_STYLE[credential.status]}`}
          >
            {CREDENTIAL_STATUS_LABELS[credential.status]}
          </span>
        </span>
        <span>
          {credential.expiresOn
            ? `만료일 ${credential.expiresOn} (${daysText(credential.daysLeft)})`
            : '만료 없음'}
          {credential.issuedOn ? ` · 취득일 ${credential.issuedOn}` : ''}
        </span>
        {credential.memo && <span className="text-foreground/70">{credential.memo}</span>}
        {credential.file && (
          <span className="flex flex-wrap items-center gap-2">
            첨부 {credential.file.name}
            {credential.file.status === 'READY' ? (
              <Button
                type="button"
                variant="secondary"
                aria-label={`${credential.typeName} 서류 열기`}
                onClick={() => void openFile(employeeId, credential.id, onError)}
              >
                열기
              </Button>
            ) : (
              <span className="text-foreground/70">(검사 중)</span>
            )}
          </span>
        )}
      </div>
      {!editing && !confirmDelete && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            수정·갱신
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={`${credential.typeName} 삭제`}
            onClick={() => setConfirmDelete(true)}
          >
            삭제
          </Button>
        </div>
      )}
      {confirmDelete && (
        <div className="flex flex-col gap-2 rounded-xl border border-danger p-4">
          <p>{credential.typeName} 서류를 삭제할까요? 목록에서 사라집니다</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={remove.isPending}
              onClick={() => {
                onError('');
                remove
                  .mutateAsync(credential.id)
                  .catch((caught: unknown) => onError(getErrorDetailMessage(caught)));
              }}
            >
              삭제 확인
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
              취소
            </Button>
          </div>
        </div>
      )}
      {editing && (
        <div className="flex flex-col gap-3">
          <FormField label="취득일" error={errors.issuedOn}>
            <DateInput value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
          </FormField>
          <FormField label="만료일" hint="갱신하면 새 만료일로 바꿉니다" error={errors.expiresOn}>
            <DateInput value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
          </FormField>
          <FormField label="메모" error={errors.memo}>
            <Input
              maxLength={CREDENTIAL_MEMO_MAX_LENGTH}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </FormField>
          <FormField
            label="파일 바꾸기 (선택)"
            hint="이미지·PDF만 올릴 수 있습니다"
            error={errors.fileId}
          >
            <Input
              type="file"
              accept={EMPLOYEE_DOCUMENT_ACCEPT}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? '저장 중' : '저장'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              취소
            </Button>
          </div>
        </div>
      )}
    </li>
  );
};

// 서류·자격: 자격증·안전교육 이수증·건강검진 서류를 올리고 만료일을 관리함
export const EmployeeCredentialsPanel = ({ employeeId }: { employeeId: string }) => {
  const credentials = useCredentials(employeeId);
  const options = useOptions();
  const create = useCreateCredential(employeeId);
  const [typeId, setTypeId] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [memo, setMemo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    if (!typeId) {
      setErrors({ typeId: VALIDATION_MESSAGES.selectRequired('서류 종류') });
      return;
    }

    const parsed = credentialCreateSchema.safeParse({
      typeId,
      issuedOn: issuedOn || null,
      expiresOn: expiresOn || null,
      memo: memo.trim() || null,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    setBusy(true);

    try {
      const fileId = file ? await uploadEmployeeDocument(employeeId, file) : undefined;

      await create.mutateAsync({ ...parsed.data, ...(fileId ? { fileId } : {}) });
      setTypeId('');
      setIssuedOn('');
      setExpiresOn('');
      setMemo('');
      setFile(null);
      // 같은 파일을 다시 고를 수 있도록 입력칸을 새로 그림
      setFileKey((key) => key + 1);
      setOpen(false);
    } catch (caught) {
      const { byField, root } = splitServerErrors(caught, FIELDS);

      setErrors(byField);
      setRootError(
        root || (Object.keys(byField).length === 0 ? getErrorDetailMessage(caught) : ''),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="credentials-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="credentials-heading" className="text-lg font-bold">
            서류·자격
          </h2>
          <p className="text-sm text-foreground/70">
            서류 사본에 주민등록번호가 보이면 가리고 올려 주세요. 서류 파일을 열면 열람 기록이
            남습니다
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          서류 등록
        </Button>
      </div>
      {rootError && <Alert>{rootError}</Alert>}
      {credentials.isPending ? (
        <p className="text-sm">서류를 불러오는 중</p>
      ) : credentials.isError ? (
        <Alert>서류를 불러오지 못했습니다</Alert>
      ) : credentials.data.length === 0 ? (
        <p className="text-sm text-foreground/70">등록한 서류가 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {credentials.data.map((credential) => (
            <CredentialRow
              key={credential.id}
              employeeId={employeeId}
              credential={credential}
              onError={setRootError}
            />
          ))}
        </ul>
      )}
      <Modal open={open} onOpenChange={setOpen} title="서류 등록">
        {open && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => void submit(event)}
            noValidate
            aria-label="서류 등록"
          >
            <FormField label="서류 종류" error={errors.typeId}>
              <OptionSelect
                kind="CREDENTIAL_TYPE"
                options={options.data ?? []}
                emptyLabel="종류 선택"
                value={typeId}
                onValueChange={setTypeId}
              />
            </FormField>
            <FormField label="취득일 (선택)" error={errors.issuedOn}>
              <DateInput value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
            </FormField>
            <FormField
              label="만료일 (선택)"
              hint="비워 두면 만료 없는 서류입니다"
              error={errors.expiresOn}
            >
              <DateInput value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
            </FormField>
            <FormField label="메모 (선택)" error={errors.memo}>
              <Input
                maxLength={CREDENTIAL_MEMO_MAX_LENGTH}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />
            </FormField>
            <FormField
              label="파일 (선택)"
              hint="이미지·PDF만 올릴 수 있습니다"
              error={errors.fileId}
            >
              <Input
                key={fileKey}
                type="file"
                accept={EMPLOYEE_DOCUMENT_ACCEPT}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </FormField>
            <Button type="submit" disabled={busy}>
              {busy ? '등록 중' : '서류 등록'}
            </Button>
          </form>
        )}
      </Modal>
    </section>
  );
};
