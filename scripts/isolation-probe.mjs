// 회사 간 격리 외부 점검: 한 회사(피해)의 ID로 다른 회사(공격) 계정이 접근하는 모든 GET 경로를 실제 서버에 호출
// 사용: BASE_URL=http://localhost:3001 VICTIM_LOGIN=… VICTIM_PASSWORD=… ATTACKER_LOGIN=… ATTACKER_PASSWORD=… node scripts/isolation-probe.mjs
// 두 계정은 서로 다른 회사의 이메일 인증을 마친 계정이어야 하고, 피해 회사에는 데이터가 있어야 함 (조회만 하며 데이터를 바꾸지 않음)
// 통과 기준: 피해 회사 ID로 호출했을 때 공격 계정은 200을 받지 않고, 어떤 응답에도 피해 회사 ID가 섞여 나오지 않음
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = (name) => {
  const value = process.env[name];

  if (!value) {
    console.error(`${name} 환경 변수가 필요합니다`);
    process.exit(2);
  }

  return value;
};

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173';
const openapi = JSON.parse(readFileSync(resolve('packages/shared/openapi/openapi.json'), 'utf8'));
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const HEADERS = {
  'content-type': 'application/json',
  'x-field-note-client': 'web',
  origin: ORIGIN,
};

const login = async (loginId, password) => {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ loginId, password, isRemembered: false }),
  });

  if (res.status !== 200) {
    console.error(`로그인 실패 (${loginId}): ${res.status}`);
    process.exit(2);
  }

  return res.headers.get('set-cookie').split(';')[0];
};

// 서버의 요청 횟수 제한(429)에 걸리면 잠시 기다렸다 다시 부름 (제한을 끄지 않고 점검하기 위함)
const get = async (path, cookie) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const res = await fetch(`${BASE}${path}`, { headers: { ...HEADERS, cookie } });
    const text = await res.text();

    if (res.status !== 429) return { status: res.status, text };

    await new Promise((done) => setTimeout(done, 2000));
  }

  throw new Error(`요청 횟수 제한이 풀리지 않음: ${path}`);
};

const victim = await login(env('VICTIM_LOGIN'), env('VICTIM_PASSWORD'));
const attacker = await login(env('ATTACKER_LOGIN'), env('ATTACKER_PASSWORD'));
const getPaths = Object.entries(openapi.paths)
  .filter(([, methods]) => methods.get)
  .map(([path, methods]) => [path, methods.get]);
const pathParams = (path) => [...path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
const isSkipped = (path) => path.includes('/auth/') || path.includes('/invitations/');
const noParam = getPaths.filter(([path]) => pathParams(path).length === 0 && !isSkipped(path));
const ids = new Set();
// 주소별 응답에서 나온 ID (예: /projects 목록의 ID는 /projects/{id}의 후보)
const idsByUrl = new Map();
const harvest = (url, text) => {
  const found = [...new Set(text.match(UUID) ?? [])];

  found.forEach((id) => ids.add(id));
  idsByUrl.set(url, found);
};
const violations = [];
const leakedIn = (text) => (text.match(UUID) ?? []).filter((id) => ids.has(id));

// 1) 피해 회사의 매개변수 없는 조회에서 ID 수집
for (const [path] of noParam) {
  const res = await get(path, victim);

  if (res.status === 200) harvest(path, res.text);
}

// 2) ID가 들어가는 주소를 피해 회사로 호출해 유효한 주소를 찾음 (응답의 새 ID도 수집, 두 번 반복)
const valid = [];
const usable = new Set();
const seen = new Set();
let calls = 0;

for (let round = 0; round < 2; round += 1) {
  for (const [path] of getPaths) {
    const names = pathParams(path);

    if (names.length === 0 || names.length > 2 || isSkipped(path)) continue;

    // 첫 번째 ID 후보: 앞 경로의 목록에서 나온 ID (없으면 지금까지 모은 ID 일부)
    const firstPrefix = path.slice(0, path.indexOf('{') - 1);
    const firstCandidates = idsByUrl.get(firstPrefix) ?? [...ids].slice(0, 60);
    const pools =
      names.length === 1
        ? firstCandidates.map((id) => [id])
        : firstCandidates
            .filter((id) => usable.has(id))
            .flatMap((first) => {
              // 두 번째 ID 후보: 첫 번째 ID를 채운 앞 경로의 목록 응답에서 나온 ID
              const listUrl = path
                .slice(0, path.lastIndexOf('{') - 1)
                .replace(`{${names[0]}}`, first);

              return (idsByUrl.get(listUrl) ?? []).map((second) => [first, second]);
            });

    for (const combo of pools) {
      let url = path;

      names.forEach((name, index) => {
        url = url.replace(`{${name}}`, combo[index]);
      });

      if (seen.has(url)) continue;

      seen.add(url);
      calls += 1;

      const res = await get(url, victim);

      if (res.status === 200) {
        if (names.length === 1) usable.add(combo[0]);

        valid.push(url);
        harvest(url, res.text);
      }
    }
  }
}

// 3) 같은 주소를 공격 계정으로 호출: 200이면 안 되고 응답에 피해 회사 ID가 없어야 함
const attackerStatuses = {};

for (const url of valid) {
  const res = await get(url, attacker);
  const leaked = leakedIn(res.text);

  attackerStatuses[res.status] = (attackerStatuses[res.status] ?? 0) + 1;

  if (res.status === 200 || leaked.length > 0) {
    violations.push({ url, status: res.status, leaked: leaked.slice(0, 3) });
  }
}

// 4) 공격 계정의 목록 조회에 피해 회사 ID가 섞이지 않는지, 목록 필터(쿼리)에 피해 회사 ID를 넣어도 새지 않는지
for (const [path, operation] of noParam) {
  const list = await get(path, attacker);
  const listLeaked = leakedIn(list.text);

  if (listLeaked.length > 0) {
    violations.push({ url: path, status: list.status, leaked: listLeaked.slice(0, 3) });
  }

  const idQueries = (operation.parameters ?? []).filter(
    (parameter) =>
      parameter.in === 'query' &&
      (/id$/i.test(parameter.name) || parameter.schema?.format === 'uuid'),
  );

  for (const query of idQueries) {
    for (const id of ids) {
      calls += 1;

      const res = await get(`${path}?${query.name}=${id}`, attacker);
      const leaked = leakedIn(res.text);

      if (leaked.length > 0) {
        violations.push({
          url: `${path}?${query.name}=${id}`,
          status: res.status,
          leaked: leaked.slice(0, 3),
        });
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      victimIds: ids.size,
      calls,
      validForVictim: valid.length,
      attackerStatuses,
      violationCount: violations.length,
      violations: violations.slice(0, 10),
    },
    null,
    2,
  ),
);

if (ids.size === 0 || valid.length === 0) {
  console.error('피해 회사의 데이터가 없어 점검하지 못했습니다');
  process.exit(2);
}

process.exit(violations.length === 0 ? 0 : 1);
