import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * @description 조건부 클래스 결합과 Tailwind 클래스 충돌 해소
 * @param inputs 클래스 값들
 * @returns 병합된 클래스 문자열
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
