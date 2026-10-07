import { z } from 'zod';

// 직원 카드 (서비스 기획서 §8). 직원은 서비스에 로그인하지 않고 관리자가 기록한다
// 주민등록번호·계좌번호·급여는 저장하지 않는다. 생년월일·연락처는 카드(상세)에서만 내려 준다
export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'LEFT'] as const;

export const employeeStatusSchema = z.enum(EMPLOYEE_STATUSES);

export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: '재직',
  ON_LEAVE: '휴직',
  LEFT: '퇴사',
};

// 회사당 직원 수 상한 (소규모 팀 대상이며 목록을 한 번에 내려 주는 구조의 안전장치)
export const EMPLOYEE_MAX_PER_COMPANY = 500;
export const EMPLOYEE_NAME_MAX_LENGTH = 50;
export const EMPLOYEE_TITLE_MAX_LENGTH = 30;
export const EMPLOYEE_PHONE_MAX_LENGTH = 30;
export const EMPLOYEE_MEMO_MAX_LENGTH = 1000;
export const EMPLOYEE_MIN_DATE = '1900-01-01';

export const employeeNameSchema = z
  .string()
  .trim()
  .min(1, '이름을 입력해 주세요')
  .max(EMPLOYEE_NAME_MAX_LENGTH, `이름은 ${EMPLOYEE_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`);

const dateSchema = z.iso
  .date('날짜 형식이 올바르지 않습니다')
  .refine((value) => value >= EMPLOYEE_MIN_DATE, '날짜가 너무 오래되었습니다');

const titleSchema = z
  .string()
  .trim()
  .min(1)
  .max(EMPLOYEE_TITLE_MAX_LENGTH, `직책은 ${EMPLOYEE_TITLE_MAX_LENGTH}자까지 입력할 수 있습니다`);

// 숫자·하이픈·괄호·공백·+ 만 허용 (자유 입력 대신 형식을 좁혀 이상한 값이 저장되지 않게 함)
const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(EMPLOYEE_PHONE_MAX_LENGTH, `연락처는 ${EMPLOYEE_PHONE_MAX_LENGTH}자까지 입력할 수 있습니다`)
  .regex(/^[0-9+\-() ]+$/, '연락처는 숫자와 - ( ) + 만 입력할 수 있습니다');

const memoSchema = z
  .string()
  .max(EMPLOYEE_MEMO_MAX_LENGTH, `메모는 ${EMPLOYEE_MEMO_MAX_LENGTH}자까지 입력할 수 있습니다`);

// 목록·카드 공통 항목 (생년월일·연락처 제외)
export const employeeSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  // 직책(표시용: 반장, 기공, 조공 등)
  title: z.string().nullable(),
  // 선택 목록(직종·직원 구분) 항목의 id. 이름은 선택 목록에서 찾는다
  jobTypeId: z.uuid().nullable(),
  workerTypeId: z.uuid().nullable(),
  status: employeeStatusSchema,
  hiredOn: z.iso.date().nullable(),
  leftOn: z.iso.date().nullable(),
});

export type EmployeeSummary = z.infer<typeof employeeSummarySchema>;

export const employeeDetailSchema = employeeSummarySchema.extend({
  birthDate: z.iso.date().nullable(),
  phone: z.string().nullable(),
  memo: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type EmployeeDetail = z.infer<typeof employeeDetailSchema>;

export const employeesResponseSchema = z.object({ items: z.array(employeeSummarySchema) });

export type EmployeesResponse = z.infer<typeof employeesResponseSchema>;

export const employeeListQuerySchema = z.object({
  status: employeeStatusSchema.optional(),
  jobTypeId: z.uuid().optional(),
  workerTypeId: z.uuid().optional(),
  // 이름 검색 (부분 일치)
  q: z.string().trim().max(EMPLOYEE_NAME_MAX_LENGTH).optional(),
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

export const employeeParamsSchema = z.object({ id: z.uuid() });

// 간편 등록: 이름만 있으면 된다 (일용·협력 인력용). 나머지는 나중에 채운다
export const employeeCreateSchema = z.object({
  name: employeeNameSchema,
  jobTypeId: z.uuid().nullish(),
  workerTypeId: z.uuid().nullish(),
  title: titleSchema.nullish(),
  // 등록 때는 퇴사 상태로 만들 수 없다
  status: z.enum(['ACTIVE', 'ON_LEAVE']).optional(),
  hiredOn: dateSchema.nullish(),
  birthDate: dateSchema.nullish(),
  phone: phoneSchema.nullish(),
  memo: memoSchema.nullish(),
});

export type EmployeeCreate = z.infer<typeof employeeCreateSchema>;

// 수정: 보낸 항목만 바꾸고, 비울 수 있는 항목은 null로 지운다
export const employeeUpdateSchema = z
  .object({
    name: employeeNameSchema,
    jobTypeId: z.uuid().nullable(),
    workerTypeId: z.uuid().nullable(),
    title: titleSchema.nullable(),
    status: employeeStatusSchema,
    hiredOn: dateSchema.nullable(),
    leftOn: dateSchema.nullable(),
    birthDate: dateSchema.nullable(),
    phone: phoneSchema.nullable(),
    memo: memoSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: '변경할 값이 없습니다',
  });

export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;
