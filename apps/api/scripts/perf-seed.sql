-- 대용량 성능 점검용 데이터 (한빛판금 회사에 3년치 기록을 추가, 로컬 개발 DB 전용)
-- 실행: docker exec -i field-note-postgres-1 psql -U field_note -d field_note -v ON_ERROR_STOP=1 < apps/api/scripts/perf-seed.sql
-- 되돌리기: pnpm db:reset
-- 규모: 직원 40명, 프로젝트 300건(진행 중 약 30건), 작업 내역 약 2만 건, 직원별 공수 약 7.8만 건, 메모 약 3천 건

\set company '''0198d000-0000-7000-8000-0000000000a1'''
\set creator '''0198d000-0000-7000-8000-0000000000b1'''
\set today '''2026-10-17'''

BEGIN;

-- 직원 29명 추가 (기존 11명 + 29명 = 40명)
INSERT INTO employees (company_id, name, title, status, hired_on)
SELECT :company, '성능직원' || lpad(n::text, 2, '0'), '기공', 'ACTIVE', DATE '2023-01-01'
FROM generate_series(1, 29) AS n;

-- 프로젝트 300건: 3.5일 간격으로 시작하는 90일짜리, 끝난 지 오래된 것은 종료
INSERT INTO projects (company_id, code, name, status, site_name, client_id, manager_id, contract_date,
                      planned_start, planned_end, actual_start, actual_end)
SELECT :company,
       to_char(s, 'YYYY') || '-' || lpad((100 + n)::text, 3, '0'),
       '성능 시험 공사 ' || n,
       CASE WHEN s + 90 < DATE :today - 100 THEN 'CLOSED'::project_status ELSE 'IN_PROGRESS'::project_status END,
       '성능 시험 현장 ' || n,
       (SELECT id FROM partners WHERE company_id = :company ORDER BY id LIMIT 1),
       (SELECT id FROM employees WHERE company_id = :company ORDER BY id LIMIT 1),
       s - 10, s, s + 90, s,
       CASE WHEN s + 90 < DATE :today - 100 THEN s + 90 END
FROM (
  SELECT n, (DATE '2023-10-02' + (n * 3.5)::int) AS s
  FROM generate_series(1, 300) AS n
) AS t
WHERE s <= DATE :today;

-- 작업 내역: 프로젝트마다 기간 안의 평일 (오늘까지)
INSERT INTO work_logs (company_id, project_id, work_date, status, content, area, saved_at)
SELECT :company, p.id, d::date, 'SAVED', '성능 시험 작업 내용 ' || to_char(d, 'YYYY-MM-DD'), 'A동', d::timestamptz + interval '18 hours'
FROM projects p,
     generate_series(p.planned_start::timestamp, LEAST(p.planned_end, DATE :today)::timestamp, interval '1 day') AS d
WHERE p.company_id = :company AND p.name LIKE '성능 시험 공사%' AND extract(isodow FROM d) < 6;

-- 직원별 공수: 작업 내역마다 4명 (직원 40명을 돌아가며), 작업 구분은 돌아가며
INSERT INTO work_log_entries (company_id, work_log_id, employee_id, category_id, minutes)
SELECT :company, w.id, e.id, c.id, 480
FROM (SELECT id, row_number() OVER (ORDER BY work_date, id) AS rn FROM work_logs
      WHERE company_id = :company AND content LIKE '성능 시험 작업 내용%') AS w
JOIN (SELECT id, row_number() OVER (ORDER BY id) - 1 AS idx FROM employees WHERE company_id = :company) AS e
  ON e.idx IN ((w.rn * 4) % 40, (w.rn * 4 + 1) % 40, (w.rn * 4 + 2) % 40, (w.rn * 4 + 3) % 40)
JOIN (SELECT id, row_number() OVER (ORDER BY id) - 1 AS idx FROM option_items
      WHERE company_id = :company AND kind = 'WORK_CATEGORY') AS c
  ON c.idx = w.rn % (SELECT count(*) FROM option_items WHERE company_id = :company AND kind = 'WORK_CATEGORY');

-- 투입 계획: 프로젝트마다 4명, 프로젝트 기간 전체
INSERT INTO project_assignments (company_id, project_id, employee_id, start_date, end_date, planned_minutes)
SELECT :company, p.id, e.id, p.planned_start, p.planned_end, 480 * 60
FROM (SELECT id, planned_start, planned_end, row_number() OVER (ORDER BY planned_start, id) AS rn FROM projects
      WHERE company_id = :company AND name LIKE '성능 시험 공사%') AS p
JOIN (SELECT id, row_number() OVER (ORDER BY id) - 1 AS idx FROM employees WHERE company_id = :company) AS e
  ON e.idx IN ((p.rn * 4) % 40, (p.rn * 4 + 1) % 40, (p.rn * 4 + 2) % 40, (p.rn * 4 + 3) % 40);

-- 메모: 프로젝트마다 10건 + 프로젝트 없는 메모 500건
INSERT INTO memos (company_id, project_id, content, tag, memo_date, created_by)
SELECT :company, p.id, '성능 시험 메모 ' || n, 'OTHER', p.planned_start + n, :creator
FROM projects p, generate_series(1, 10) AS n
WHERE p.company_id = :company AND p.name LIKE '성능 시험 공사%';

INSERT INTO memos (company_id, content, tag, memo_date, created_by)
SELECT :company, '성능 시험 일반 메모 ' || n, 'OTHER', DATE '2023-10-02' + (n % 1000), :creator
FROM generate_series(1, 500) AS n;

COMMIT;

ANALYZE;

SELECT 'projects' AS t, count(*) FROM projects UNION ALL
SELECT 'work_logs', count(*) FROM work_logs UNION ALL
SELECT 'work_log_entries', count(*) FROM work_log_entries UNION ALL
SELECT 'project_assignments', count(*) FROM project_assignments UNION ALL
SELECT 'memos', count(*) FROM memos UNION ALL
SELECT 'employees', count(*) FROM employees;
