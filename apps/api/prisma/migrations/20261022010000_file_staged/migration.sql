-- 업로드 임시 보관: 폼에 연결되기 전 파일은 STAGED, 24시간이 지나면 EXPIRED, 폼을 취소하면 DISCARDED 사유로 거부
ALTER TYPE "file_status" ADD VALUE IF NOT EXISTS 'STAGED';
ALTER TYPE "file_reject_reason" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "file_reject_reason" ADD VALUE IF NOT EXISTS 'DISCARDED';
