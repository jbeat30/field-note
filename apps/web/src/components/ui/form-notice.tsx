import { CircleAlert } from 'lucide-react';
import { useEffect, useReducer, useRef } from 'react';

import { cn } from '../../lib/cn';

type FormNoticeProps = {
  message: string | null;
  className?: string;
};

type State = { text: string; visible: boolean };
type Action = { type: 'show'; text: string } | { type: 'hide' };

const reduce = (state: State, action: Action): State => {
  if (action.type === 'show') return { text: action.text, visible: true };
  return { ...state, visible: false };
};

// 입력 확인 안내 (예: "기록할 자재를 한 줄 이상 적어 주세요"): 5초 뒤 또는 누르면 사라짐
// 서버 오류("저장하지 못했습니다")처럼 놓치면 안 되는 안내는 Alert 그대로 사용
export const FormNotice = ({ message, className }: FormNoticeProps) => {
  const [{ text, visible }, dispatch] = useReducer(reduce, { text: '', visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;

    dispatch({ type: 'show', text: message });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dispatch({ type: 'hide' }), 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message]);

  if (!visible || !text) return null;

  return (
    <p
      role="alert"
      className={cn(
        'flex cursor-pointer items-start gap-2 rounded-lg bg-warning-subtle px-3 py-2.5 text-sm font-medium text-warning',
        className,
      )}
      onClick={() => dispatch({ type: 'hide' })}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
};
