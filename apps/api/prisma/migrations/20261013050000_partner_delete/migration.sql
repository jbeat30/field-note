-- 명부는 어디에도 쓰이지 않은 업체에 한해 앱 계정이 직접 삭제 가능
-- 프로젝트(고객)·자재 기록(공급처)이 참조하는 업체는 외래 키(Restrict)가 삭제를 막고 숨김 처리를 사용
-- 행 격리는 기존 company_isolation 정책(USING)이 삭제에도 동일하게 적용
GRANT DELETE ON "partners" TO field_note_app;
