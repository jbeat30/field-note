-- 계정 복구·소유자 이전(서비스 기획서 §6.3, §6.6): 운영자가 발급하는 링크의 용도와 운영자 작업 종류
ALTER TYPE "operator_action_type" ADD VALUE IF NOT EXISTS 'ACCOUNT_RECOVERY_ISSUED';
ALTER TYPE "operator_action_type" ADD VALUE IF NOT EXISTS 'OWNER_TRANSFER_ISSUED';
CREATE TYPE "invitation_purpose" AS ENUM ('SIGNUP', 'RECOVERY', 'TRANSFER');
