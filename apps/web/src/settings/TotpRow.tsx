import type { TotpSetupResponse } from '@field-note/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '../api/client';
import { useSocialMethods } from '../auth/useSocial';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { getErrorMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';

import { RecoveryCodes } from './RecoveryCodes';
import { TotpDisableForm, TotpRegenerateForm } from './TotpCodeForms';
import { TotpSetupForm } from './TotpSetupForm';
import { useTotpStatus } from './useTotp';

type Dialog = 'setup' | 'codes' | 'disable' | 'regenerate' | null;

// 남은 복구 코드가 이 개수 이하면 다시 받도록 안내
const LOW_RECOVERY_CODES = 2;

// 보안 목록의 2단계 인증 줄 (선택 기능, 기본은 꺼짐)
export const TotpRow = () => {
  const queryClient = useQueryClient();
  const status = useTotpStatus();
  const methods = useSocialMethods();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setStarting] = useState(false);
  const isEnabled = status.data?.isEnabled === true;
  const left = status.data?.recoveryCodesLeft ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.totp() });
  const close = () => {
    setDialog(null);
    setSetup(null);
  };

  // 등록 시작은 눌렀을 때 한 번만 요청 (화면이 다시 그려져도 인증 키가 바뀌지 않게 함)
  const start = async () => {
    setStartError(null);
    setStarting(true);

    const { data, error } = await apiClient.POST('/api/v1/me/totp/setup');

    setStarting(false);

    if (!data) {
      setStartError(getErrorMessage(error));
      return;
    }

    setSetup(data);
    setDialog('setup');
  };

  const showCodes = (recoveryCodes: string[]) => {
    setCodes(recoveryCodes);
    setDialog('codes');
    void refresh();
  };

  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex min-h-touch items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">2단계 인증</p>
          <p className="text-sm text-sub">
            {status.isPending
              ? '확인 중'
              : isEnabled
                ? `켜짐 · 복구 코드 ${left}개 남음`
                : '꺼짐 · 켜면 로그인할 때 인증 앱의 6자리 코드가 더 필요합니다 (선택)'}
          </p>
        </div>
        {!status.isPending &&
          (isEnabled ? (
            <Button
              variant="secondary"
              size="sm"
              aria-label="2단계 인증 끄기"
              onClick={() => setDialog('disable')}
            >
              끄기
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              aria-label="2단계 인증 켜기"
              disabled={isStarting}
              onClick={start}
            >
              켜기
            </Button>
          ))}
      </div>
      {startError && <Alert>{startError}</Alert>}
      {status.isError && <Alert>2단계 인증 상태를 불러오지 못했습니다</Alert>}
      {isEnabled && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {left <= LOW_RECOVERY_CODES && (
            <p className="text-sm text-warning">복구 코드가 {left}개 남았습니다</p>
          )}
          <Button variant="link" size="sm" onClick={() => setDialog('regenerate')}>
            복구 코드 다시 받기
          </Button>
        </div>
      )}

      <Modal
        open={dialog === 'setup' && setup !== null}
        onOpenChange={(open) => !open && close()}
        title="2단계 인증 켜기"
        description="인증 앱을 연결하면 로그인할 때 앱의 6자리 코드가 더 필요합니다"
      >
        {setup && <TotpSetupForm setup={setup} onEnabled={showCodes} />}
      </Modal>
      {/* 복구 코드는 다시 볼 수 없으므로 확인 버튼으로만 닫음 */}
      <Modal
        open={dialog === 'codes'}
        onOpenChange={() => undefined}
        title="복구 코드"
        description="2단계 인증을 켰습니다. 복구 코드를 꼭 적어 두세요"
      >
        <RecoveryCodes codes={codes} onDone={close} />
      </Modal>
      <Modal
        open={dialog === 'disable'}
        onOpenChange={(open) => !open && close()}
        title="2단계 인증 끄기"
        description="끄면 아이디와 비밀번호만으로 로그인할 수 있게 됩니다"
      >
        <TotpDisableForm
          needsPassword={methods.data?.hasPassword !== false}
          onDone={() => {
            close();
            void refresh();
          }}
        />
      </Modal>
      <Modal
        open={dialog === 'regenerate'}
        onOpenChange={(open) => !open && close()}
        title="복구 코드 다시 받기"
        description="인증 코드로 본인을 확인한 뒤 새 복구 코드를 발급합니다"
      >
        <TotpRegenerateForm onDone={showCodes} />
      </Modal>
    </li>
  );
};
