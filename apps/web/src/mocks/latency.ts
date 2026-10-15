import { delay } from 'msw';

// Jest 시험에서는 기다리지 않음 (요청이 많은 시험이 제한 시간을 넘지 않게), 브라우저(목업 모드·Storybook)에서는 그대로 기다림
const isJest = typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined;

/**
 * @description 실제 서버처럼 응답을 조금 늦춤 (화면의 불러오는 중 상태를 확인하기 위해)
 * @param ms 늦출 시간
 */
export const mockDelay = (ms: number) => (isJest ? Promise.resolve() : delay(ms));
