-- 명부는 어디에도 쓰이지 않은 업체에 한해 앱 계정이 직접 삭제할 수 있다.
-- 프로젝트(고객)·자재 기록(공급처)이 참조하는 업체는 외래 키(Restrict)가 막고, 그런 업체는 숨김 처리를 쓴다.
-- 행 격리는 기존 company_isolation 정책(USING)이 삭제에도 적용된다.
GRANT DELETE ON "partners" TO field_note_app;
