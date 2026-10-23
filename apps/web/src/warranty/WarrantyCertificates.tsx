import {
  WARRANTY_ISSUER_MAX_LENGTH,
  warrantyCertificateCreateSchema,
  type ProjectWarranty,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { DateInput } from '../components/ui/date-input';
import { Select } from '../components/ui/select';
import { useDocuments } from '../documents/useDocuments';
import { splitServerErrors } from '../lib/serverErrors';

import { useAddCertificate, useRemoveCertificate, useUpdateCertificate } from './useWarranty';

const FIELDS = ['documentId', 'expiresOn', 'issuer', 'projectId'] as const;

const daysText = (daysLeft: number) =>
  daysLeft < 0 ? `${-daysLeft}일 지남` : daysLeft === 0 ? '오늘 만료' : `${daysLeft}일 남음`;

const CertificateRow = ({
  projectId,
  certificate,
  editable,
  onError,
}: {
  projectId: string;
  certificate: ProjectWarranty['certificates'][number];
  editable: boolean;
  onError: (message: string) => void;
}) => {
  const update = useUpdateCertificate(projectId);
  const remove = useRemoveCertificate(projectId);
  const [editing, setEditing] = useState(false);
  const [expiresOn, setExpiresOn] = useState(certificate.expiresOn);

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {certificate.title}
          {certificate.isSensitive ? ' · 민감' : ''}
        </span>
        <span>
          만료일 {certificate.expiresOn} ({daysText(certificate.daysLeft)})
          {certificate.issuer ? ` · 발급처 ${certificate.issuer}` : ''}
        </span>
      </div>
      {editable && !editing && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            만료일 수정
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={`${certificate.title} 삭제`}
            disabled={remove.isPending}
            onClick={() => {
              onError('');
              remove.mutateAsync(certificate.id).catch((error: unknown) => {
                onError(splitServerErrors(error, []).root);
              });
            }}
          >
            삭제
          </Button>
        </div>
      )}
      {editing && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField label="만료일">
              <DateInput value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
            </FormField>
          </div>
          <Button
            type="button"
            disabled={!expiresOn || update.isPending}
            onClick={() => {
              onError('');
              update
                .mutateAsync({ certificateId: certificate.id, body: { expiresOn } })
                .then(() => setEditing(false))
                .catch((error: unknown) => onError(splitServerErrors(error, []).root));
            }}
          >
            저장
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            취소
          </Button>
        </div>
      )}
    </li>
  );
};

// 보증서(보증증권 등): 문서함에 올린 문서를 선택하고 만료일을 붙여 관리
export const WarrantyCertificates = ({
  projectId,
  warranty,
  editable,
}: {
  projectId: string;
  warranty: ProjectWarranty;
  editable: boolean;
}) => {
  const documents = useDocuments(projectId);
  const add = useAddCertificate(projectId);
  const [documentId, setDocumentId] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [issuer, setIssuer] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState('');
  const registered = new Set(warranty.certificates.map((item) => item.documentId));
  const choices = (documents.data ?? []).filter((item) => !registered.has(item.id));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setRootError('');

    // 비어 있는 입력은 서버 스키마의 일반 문구 대신 해야 할 일을 안내
    if (!documentId || !expiresOn) {
      setErrors({
        ...(documentId ? {} : { documentId: '문서를 선택해 주세요' }),
        ...(expiresOn ? {} : { expiresOn: '만료일을 입력해 주세요' }),
      });
      return;
    }

    const parsed = warrantyCertificateCreateSchema.safeParse({
      documentId,
      expiresOn,
      issuer: issuer.trim() || null,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= issue.message;
      }

      setErrors(next);
      return;
    }

    void add
      .mutateAsync(parsed.data)
      .then(() => {
        setDocumentId('');
        setExpiresOn('');
        setIssuer('');
      })
      .catch((error: unknown) => {
        const { byField, root } = splitServerErrors(error, FIELDS);

        setErrors(byField);
        setRootError(root || byField.projectId || '');
      });
  };

  return (
    <div className="flex flex-col gap-3">
      {rootError && <Alert>{rootError}</Alert>}
      {warranty.certificates.length === 0 ? (
        <p className="text-sm text-sub">등록한 보증서가 없습니다</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {warranty.certificates.map((certificate) => (
            <CertificateRow
              key={certificate.id}
              projectId={projectId}
              certificate={certificate}
              editable={editable}
              onError={setRootError}
            />
          ))}
        </ul>
      )}
      {editable && (
        <form className="flex flex-col gap-3" onSubmit={submit} noValidate aria-label="보증서 등록">
          <FormField
            label="문서함에서 선택"
            error={errors.documentId}
            hint="보증서 파일은 문서함에 올린 뒤 여기서 고릅니다"
          >
            <Select
              value={documentId}
              onValueChange={setDocumentId}
              placeholder="문서 선택"
              options={choices.map((item) => ({ value: item.id, label: item.title }))}
            />
          </FormField>
          <FormField label="만료일" error={errors.expiresOn}>
            <DateInput value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
          </FormField>
          <FormField label="발급처 (선택)" error={errors.issuer}>
            <Input
              maxLength={WARRANTY_ISSUER_MAX_LENGTH}
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
            />
          </FormField>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? '등록 중' : '보증서 등록'}
          </Button>
        </form>
      )}
    </div>
  );
};
