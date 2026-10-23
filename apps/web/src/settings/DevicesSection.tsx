import { type Device } from '@field-note/shared';
import { useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';

import { useDevices, useRevokeDevice } from './useDevices';

// 이만큼 쓰지 않은 로그인은 "오래 쓰지 않음"으로 접음 (로그인 유지 기간 안에서 남아 있는 것들)
const STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatLastActive = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

// IP는 마지막으로 쓴 때의 값을 표시하고 로그인 때와 다르면 로그인 때 IP를 안내 문구로 부착
const ipText = (device: Device) => {
  const ip = device.lastIp ?? device.ipAddress;

  if (!ip) return 'IP 알 수 없음';

  return device.ipAddress && device.ipAddress !== ip
    ? `IP ${ip} (로그인 ${device.ipAddress})`
    : `IP ${ip}`;
};

const DeviceRow = ({
  device,
  disabled,
  onRevoke,
}: {
  device: Device;
  disabled: boolean;
  onRevoke: (device: Device) => void;
}) => (
  <li className="flex min-h-touch items-center justify-between gap-3 py-2">
    <div className="min-w-0">
      <p className="font-medium">
        {device.label}
        {device.isCurrent && <span className="ml-2 text-sm font-normal text-primary">이 기기</span>}
      </p>
      <p className="text-sm text-sub">
        {ipText(device)} · 마지막 사용 {formatLastActive(device.lastActiveAt)}
      </p>
    </div>
    {!device.isCurrent && (
      <Button
        variant="secondary"
        size="sm"
        aria-label={`${device.label} 로그아웃`}
        disabled={disabled}
        onClick={() => onRevoke(device)}
      >
        로그아웃
      </Button>
    )}
  </li>
);

// 로그인한 기기: 이 기기를 맨 위에, 이 기기가 아닌 로그인에만 로그아웃(확인 창), 오래 쓰지 않은 로그인은 접어 두고 한 번에 로그아웃
export const DevicesSection = () => {
  const devices = useDevices();
  const revoke = useRevokeDevice();
  const { confirm, dialog } = useConfirm();
  // 렌더 중에 시계를 읽지 않도록 처음 그릴 때의 시각 사용
  const [renderedAt] = useState(() => Date.now());

  if (devices.isPending) {
    return <p className="text-sm">기기 목록을 불러오는 중</p>;
  }

  if (devices.isError) {
    return <Alert>기기 목록을 불러오지 못했습니다</Alert>;
  }

  const staleBefore = renderedAt - STALE_DAYS * DAY_MS;
  const current = devices.data.filter((device) => device.isCurrent);
  const others = devices.data.filter((device) => !device.isCurrent);
  const recent = others.filter((device) => Date.parse(device.lastActiveAt) >= staleBefore);
  const stale = others.filter((device) => Date.parse(device.lastActiveAt) < staleBefore);

  const revokeOne = async (device: Device) => {
    const ok = await confirm({
      title: '이 기기를 로그아웃할까요?',
      description: `"${device.label}"의 로그인이 끊기고 다시 로그인해야 합니다`,
      confirmLabel: '로그아웃',
      danger: true,
    });

    if (ok) revoke.mutate(device.id);
  };

  const revokeStale = async () => {
    const ok = await confirm({
      title: '오래 쓰지 않은 기기를 모두 로그아웃할까요?',
      description: `${stale.length}대의 로그인이 끊깁니다. 이 기기와 최근에 쓴 기기는 그대로입니다`,
      confirmLabel: '모두 로그아웃',
      danger: true,
    });

    if (ok)
      await Promise.all(
        stale.map((device) => revoke.mutateAsync(device.id).catch(() => undefined)),
      );
  };

  return (
    <div className="flex flex-col gap-2">
      {dialog}
      {revoke.isError && <Alert>기기를 로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
      <ul className="divide-y divide-line">
        {[...current, ...recent].map((device) => (
          <DeviceRow
            key={device.id}
            device={device}
            disabled={revoke.isPending}
            onRevoke={revokeOne}
          />
        ))}
      </ul>
      {stale.length > 0 && (
        <details className="rounded-lg border border-line bg-surface px-3">
          <summary className="flex min-h-touch cursor-pointer items-center justify-between gap-2 text-sm font-medium">
            오래 쓰지 않음 {stale.length}대
          </summary>
          <div className="flex flex-col gap-1 pb-3">
            <ul className="divide-y divide-line">
              {stale.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  disabled={revoke.isPending}
                  onRevoke={revokeOne}
                />
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              className="self-end"
              disabled={revoke.isPending}
              onClick={() => void revokeStale()}
            >
              오래 쓰지 않은 기기 모두 로그아웃
            </Button>
          </div>
        </details>
      )}
    </div>
  );
};
