import { z } from 'zod';

import { totpCodeSchema } from './account';
import { ZOD_MESSAGES } from './errorMessages';
import './index';

const messageOf = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);

  return result.success ? null : result.error.issues.map((issue) => issue.message);
};

describe('검증 실패 기본 문구', () => {
  it('문구를 적지 않은 길이 검증은 쉬운 한국어로 나온다 (영어 "Too small"이 화면에 나오던 문제)', () => {
    expect(messageOf(totpCodeSchema, '123')).toEqual([ZOD_MESSAGES.tooShort(6)]);
    expect(messageOf(totpCodeSchema, 'x'.repeat(30))).toEqual([ZOD_MESSAGES.tooLong(24)]);
    expect(messageOf(z.string().length(6), '12')).toEqual([ZOD_MESSAGES.exactLength(6)]);
  });

  it('값이 비었거나 형식이 다른 경우도 한국어다', () => {
    expect(messageOf(z.string(), undefined)).toEqual([ZOD_MESSAGES.required]);
    expect(messageOf(z.string(), 1)).toEqual([ZOD_MESSAGES.invalidType]);
    expect(messageOf(z.email(), 'abc')).toEqual([ZOD_MESSAGES.invalidEmail]);
    expect(messageOf(z.uuid(), 'abc')).toEqual([ZOD_MESSAGES.invalidFormat]);
    expect(messageOf(z.enum(['A', 'B']), 'C')).toEqual([ZOD_MESSAGES.invalidChoice]);
  });

  it('숫자와 목록의 범위 검증도 한국어다', () => {
    expect(messageOf(z.number().min(60), 10)).toEqual([ZOD_MESSAGES.tooSmall(60)]);
    expect(messageOf(z.number().max(960), 1000)).toEqual([ZOD_MESSAGES.tooBig(960)]);
    expect(messageOf(z.array(z.string()).min(1), [])).toEqual([ZOD_MESSAGES.tooFewItems(1)]);
    expect(messageOf(z.array(z.string()).max(2), ['a', 'b', 'c'])).toEqual([
      ZOD_MESSAGES.tooManyItems(2),
    ]);
  });

  it('스키마에 직접 적은 문구가 있으면 그것이 우선한다', () => {
    expect(messageOf(z.string().min(3, '직접 적은 문구'), 'a')).toEqual(['직접 적은 문구']);
  });

  it('화면에 나올 수 있는 어떤 기본 문구에도 영어 안내가 섞이지 않는다', () => {
    const samples = [
      messageOf(totpCodeSchema, '1'),
      messageOf(z.string(), undefined),
      messageOf(z.number(), 'x'),
      messageOf(z.iso.datetime(), 'x'),
      messageOf(z.boolean(), 'x'),
    ].flat();

    for (const message of samples) {
      expect(message).not.toMatch(/Too (small|big)|expected|Invalid input|Required/i);
    }
  });
});
