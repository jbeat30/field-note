-- 회사별 경고 기준과 보증 기본 기간 (서비스 기획서 §10.4, §10.6): 공수 소진율 경고·한도(%), 진행률과의 간격(%p), 보증 기본 개월 수
ALTER TABLE "company_settings" ADD COLUMN "burn_warn_percent" INTEGER NOT NULL DEFAULT 80;
ALTER TABLE "company_settings" ADD COLUMN "burn_limit_percent" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "company_settings" ADD COLUMN "ahead_gap_percent" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "company_settings" ADD COLUMN "warranty_default_months" INTEGER NOT NULL DEFAULT 12;

ALTER TABLE "company_settings" ADD CONSTRAINT company_settings_burn_warn_range CHECK ("burn_warn_percent" BETWEEN 50 AND 150);
ALTER TABLE "company_settings" ADD CONSTRAINT company_settings_burn_limit_range CHECK ("burn_limit_percent" BETWEEN 60 AND 200 AND "burn_limit_percent" > "burn_warn_percent");
ALTER TABLE "company_settings" ADD CONSTRAINT company_settings_ahead_gap_range CHECK ("ahead_gap_percent" BETWEEN 5 AND 60);
ALTER TABLE "company_settings" ADD CONSTRAINT company_settings_warranty_months_range CHECK ("warranty_default_months" BETWEEN 0 AND 120);
