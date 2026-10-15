-- 월 기준일수(MM 환산 기준)를 소수 첫째 자리까지 허용한다 (09 문서 §5.2, 결정 ①). 주 5일 21.7일·주 7일 30.4일 같은 값을 쓰기 위함
-- 기존 회사 값과 이미 확정한 달의 값은 그대로 두고(정수 → 실수), 새 회사의 기본값만 26일(주 6일 현장 연평균)로 바꾼다
ALTER TABLE "company_settings" ALTER COLUMN "monthly_work_days" TYPE DOUBLE PRECISION;
ALTER TABLE "company_settings" ALTER COLUMN "monthly_work_days" SET DEFAULT 26;
ALTER TABLE "monthly_closes" ALTER COLUMN "monthly_work_days" TYPE DOUBLE PRECISION;
ALTER TABLE "monthly_close_events" ALTER COLUMN "monthly_work_days" TYPE DOUBLE PRECISION;
