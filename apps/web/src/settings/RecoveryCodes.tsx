import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';

// 복구 코드는 이 화면에서만 볼 수 있으므로 적어 두었다는 확인을 받아야 닫을 수 있음
export const RecoveryCodes = ({ codes, onDone }: { codes: string[]; onDone: () => void }) => {
  const [isSaved, setSaved] = useState(false);
  const [isCopied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
    } catch {
      // 복사가 막힌 환경에서는 화면의 코드를 직접 적도록 둠
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        휴대폰을 잃어버렸을 때 인증 앱 대신 쓸 수 있는 코드입니다. 코드마다 한 번만 쓸 수 있고, 이
        화면을 닫으면 다시 볼 수 없으니 종이에 적거나 안전한 곳에 저장해 주세요
      </p>
      <ul
        aria-label="복구 코드"
        className="grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle p-4 font-mono text-base tracking-wider"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button variant="secondary" onClick={copy}>
        {isCopied ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
        {isCopied ? '복사했습니다' : '모두 복사'}
      </Button>
      <label className="flex min-h-touch items-center gap-3 text-base">
        <Checkbox checked={isSaved} onCheckedChange={(checked) => setSaved(checked === true)} />
        복구 코드를 안전한 곳에 적어 두었습니다
      </label>
      <Button disabled={!isSaved} onClick={onDone}>
        완료
      </Button>
    </div>
  );
};
