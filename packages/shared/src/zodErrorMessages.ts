import { z } from 'zod';

import { ZOD_MESSAGES } from './errorMessages';

type RawIssue = z.core.$ZodRawIssue;

const isCountable = (origin: unknown) =>
  origin === 'array' || origin === 'set' || origin === 'map' || origin === 'file';

// 스키마가 문구를 정하지 않은 검증 실패를 쉬운 한국어로 바꿈 (정하지 않은 종류는 zod 한국어 기본 문구가 대신함)
export const zodMessage = (issue: RawIssue): string | undefined => {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null
        ? ZOD_MESSAGES.required
        : ZOD_MESSAGES.invalidType;
    case 'invalid_format':
      return issue.format === 'email' ? ZOD_MESSAGES.invalidEmail : ZOD_MESSAGES.invalidFormat;
    case 'invalid_value':
      return ZOD_MESSAGES.invalidChoice;
    case 'too_small': {
      const min = Number(issue.minimum);

      if (isCountable(issue.origin)) return ZOD_MESSAGES.tooFewItems(min);
      if (issue.origin === 'string') {
        return issue.exact ? ZOD_MESSAGES.exactLength(min) : ZOD_MESSAGES.tooShort(min);
      }

      return ZOD_MESSAGES.tooSmall(min);
    }
    case 'too_big': {
      const max = Number(issue.maximum);

      if (isCountable(issue.origin)) return ZOD_MESSAGES.tooManyItems(max);
      if (issue.origin === 'string') {
        return issue.exact ? ZOD_MESSAGES.exactLength(max) : ZOD_MESSAGES.tooLong(max);
      }

      return ZOD_MESSAGES.tooBig(max);
    }
    default:
      return undefined;
  }
};

// 서버·웹이 함께 쓰는 설정이라 어느 쪽에서든 이 파일을 가져오면 적용됨 (검증은 파싱할 때 실행되므로 스키마보다 먼저 가져올 필요는 없음)
z.config({ ...z.locales.ko(), customError: zodMessage });
