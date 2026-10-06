import { useId, type ReactElement, cloneElement } from 'react';

type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  // id·aria 속성을 주입받는 입력 요소 한 개
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
};

// 라벨·도움말·오류 문구를 입력과 연결 (접근성)
export const FormField = ({ label, error, hint, children }: FormFieldProps) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? descriptionId : undefined,
      })}
      {message && (
        <p
          id={descriptionId}
          className={error ? 'text-sm text-danger' : 'text-sm text-foreground/70'}
        >
          {message}
        </p>
      )}
    </div>
  );
};
