import { useEffect, useState } from 'react';

/**
 * @description 값이 멈춘 뒤 delayMs가 지나야 따라오는 값 (타이핑 중에는 조회를 보내지 않도록)
 * @param value 원래 값
 * @param delayMs 기다릴 시간(ms)
 * @returns 멈춘 뒤의 값
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    // 값이 또 바뀌면 이전 기다림은 취소
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
