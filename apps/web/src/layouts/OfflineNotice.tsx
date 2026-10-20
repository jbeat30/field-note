import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);

  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

const getOnline = () => navigator.onLine;

// 현장에서 연결이 끊겼을 때 저장이 안 되는 이유를 알리는 안내 (입력한 내용은 화면에 그대로 있고, 연결되면 다시 저장하면 됨)
export const OfflineNotice = () => {
  const isOnline = useSyncExternalStore(subscribe, getOnline, () => true);

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning/30 bg-warning-subtle px-4 py-2 text-sm print:hidden"
    >
      <WifiOff aria-hidden className="size-4 shrink-0 text-warning" />
      <p>인터넷에 연결되어 있지 않습니다. 연결되면 다시 저장해 주세요</p>
    </div>
  );
};
