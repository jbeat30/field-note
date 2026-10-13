import { CircleAlert } from 'lucide-react';
import { useId, type ReactElement, cloneElement } from 'react';

import { cn } from '../../lib/cn';

import { Label } from './label';

type FormFieldProps = {
  label: string;
  className?: string;
  error?: string;
  hint?: string;
  // id·aria 속성을 주입받는 입력 요소 한 개
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
};

// 라벨·도움말·오류 문구를 입력과 연결 (접근성)
export const FormField = ({ label, className, error, hint, children }: FormFieldProps) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? descriptionId : undefined,
      })}
      {message && (
        <p
          id={descriptionId}
          className={cn(
            'flex items-start gap-1 text-sm',
            error ? 'font-medium text-danger' : 'text-foreground/70',
          )}
        >
          {error && <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
};
