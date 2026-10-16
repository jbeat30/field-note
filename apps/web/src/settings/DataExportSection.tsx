import { useState } from 'react';

import { useSocialMethods } from '../auth/useSocial';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { downloadCompanyDataXlsx } from '../reports/exportReport';

import { VALIDATION_MESSAGES } from '@field-note/shared';
// 회사 관리의 전체 데이터 내보내기: 해지 전에 프로젝트·직원·공수·자재·지출 등을 엑셀 한 파일로 받음
// 직원 개인정보와 단가가 들어 있어 비밀번호 로그인 계정은 비밀번호를 다시 확인하고, 파일 원본(사진·문서)은 제외
export const DataExportSection = () => {
  const methods = useSocialMethods();
  const [password, setPassword] = useState('');
  const [isExporting, setExporting] = useState(false);
  const [exported, setExported] = useState('');
  const [error, setError] = useState('');
  // 비밀번호 로그인이 없는 계정(소셜 로그인만 사용)은 확인할 비밀번호가 없음
  const needsPassword = methods.data?.hasPassword !== false;

  const submit = async () => {
    if (needsPassword && !password) {
      setError(VALIDATION_MESSAGES.required('현재 비밀번호'));
      return;
    }

    setExporting(true);
    setExported('');
    setError('');

    try {
      setExported(await downloadCompanyDataXlsx(needsPassword ? password : undefined));
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : VALIDATION_MESSAGES.DOWNLOAD_FAILED);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/70">
        프로젝트·직원·명부·투입·작업 내역(공수)·자재·지출·수입·변경 작업·보수 요청·메모·직원
        단가·파일 목록을 엑셀 한 파일로 내려받습니다. 사진·문서 파일 원본은 포함되지 않으며, 내보낸
        기록이 남습니다
      </p>
      <p className="text-sm font-medium">
        계정을 해지하면 데이터가 삭제되므로 해지 전에 받아 두세요
      </p>
      {error && <Alert>{error}</Alert>}
      {exported && <Alert variant="info">{exported} 파일을 내려받았습니다</Alert>}
      {needsPassword && (
        <FormField label="현재 비밀번호" hint="전체 데이터라 본인 확인을 위해 한 번 더 입력합니다">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>
      )}
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        disabled={isExporting}
        onClick={() => void submit()}
      >
        {isExporting ? '내려받는 중' : '전체 데이터 내려받기'}
      </Button>
    </div>
  );
};
