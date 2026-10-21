import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// openapi.json에서 Postman 컬렉션·환경 파일 생성 (손으로 따로 관리하지 않음)
// 사용: pnpm postman:generate → postman/ 폴더의 파일 3개를 Postman의 Import로 가져옴
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OPENAPI_PATH = path.join(ROOT, 'packages/shared/openapi/openapi.json');
const OUTPUT_DIR = path.join(ROOT, 'postman');

type Schema = {
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  minimum?: number;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
};

type Parameter = { name: string; in: string; required?: boolean; schema?: Schema };

type Operation = {
  summary?: string;
  tags?: string[];
  security?: unknown[];
  parameters?: Parameter[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, { description?: string; content?: Record<string, unknown> }>;
};

type OpenApi = {
  info: { title: string; description?: string };
  paths: Record<string, Record<string, Operation>>;
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const IDEMPOTENCY_HEADER = 'Idempotency-Key';

// 스키마에서 예시 값 만들기 (자리 표시용이며 서버 검증을 통과하는 값을 보장하지 않음)
const exampleOf = (schema: Schema | undefined, depth = 0): unknown => {
  if (!schema || depth > 4) return null;

  if (schema.example !== undefined) return schema.example;

  if (schema.default !== undefined) return schema.default;

  if (schema.enum?.length) return schema.enum[0];

  const variant = schema.allOf?.[0] ?? schema.oneOf?.[0] ?? schema.anyOf?.[0];

  if (variant) return exampleOf(variant, depth + 1);

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const type = types.find((item) => item !== 'null') ?? 'string';

  switch (type) {
    case 'object':
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, value]) => [
          key,
          exampleOf(value, depth + 1),
        ]),
      );
    case 'array':
      return [exampleOf(schema.items, depth + 1)];
    case 'integer':
    case 'number':
      return schema.minimum ?? 0;
    case 'boolean':
      return false;
    default:
      switch (schema.format) {
        case 'uuid':
          return '00000000-0000-0000-0000-000000000000';
        case 'date':
          return '2026-01-01';
        case 'date-time':
          return '2026-01-01T00:00:00.000Z';
        case 'email':
          return 'user@example.com';
        default:
          return 'string';
      }
  }
};

const requiredFields = (schema: Schema | undefined) => schema?.required ?? [];

const describe = (method: string, op: Operation, bodySchema: Schema | undefined) => {
  // 로그인은 세션만 만들 뿐 데이터를 바꾸지 않으므로 경고에서 뺌
  const isWrite = method !== 'get' && !op.summary?.includes('로그인');
  const lines: string[] = [];

  if (isWrite) {
    lines.push(
      '⚠️ 데이터를 바꾸거나 지울 수 있는 요청입니다. 운영(field-note-prod) 환경에서는 신중히 보내세요',
    );
  }

  lines.push(
    op.security?.length
      ? '로그인 필요: 먼저 "로그인·가입 > 아이디 로그인"을 보내 세션 쿠키를 받으세요'
      : '로그인 없이 호출할 수 있습니다',
  );

  const pathParams = (op.parameters ?? []).filter((parameter) => parameter.in === 'path');

  if (pathParams.length > 0) {
    lines.push(
      `경로 값(Path Variables)을 채워야 합니다: ${pathParams.map((p) => p.name).join(', ')}`,
    );
  }

  const required = requiredFields(bodySchema);

  if (required.length > 0) {
    lines.push(`본문 필수 항목: ${required.join(', ')} (값은 예시이므로 바꿔서 보내세요)`);
  }

  const errors = Object.keys(op.responses ?? {})
    .filter((status) => Number(status) >= 400)
    .map((status) => `${status} ${op.responses?.[status]?.description ?? ''}`.trim());

  if (errors.length > 0) {
    lines.push(`오류 응답: ${errors.join(', ')}`);
  }

  return lines.join('\n\n');
};

// 로그인 요청은 환경의 secret 변수를 쓰도록 본문을 고정 (아이디·비밀번호를 컬렉션에 적지 않음)
const LOGIN_PATH = '/api/v1/auth/login';
const LOGIN_BODY =
  '{\n  "loginId": "{{loginId}}",\n  "password": "{{password}}",\n  "isRemembered": true\n}';

const buildItem = (apiPath: string, method: string, op: Operation) => {
  const parameters = op.parameters ?? [];
  const query = parameters.filter((parameter) => parameter.in === 'query');
  const pathVariables = parameters.filter((parameter) => parameter.in === 'path');
  const headerParams = parameters.filter((parameter) => parameter.in === 'header');
  const bodySchema = op.requestBody?.content?.['application/json']?.schema;
  const postmanPath = apiPath.replace(/\{(\w+)\}/g, ':$1');
  const segments = postmanPath.split('/').filter(Boolean);

  return {
    name: `${method.toUpperCase()} ${apiPath.replace('/api/v1', '')} — ${op.summary ?? ''}`.trim(),
    request: {
      method: method.toUpperCase(),
      header: [
        ...(bodySchema ? [{ key: 'Content-Type', value: 'application/json' }] : []),
        ...headerParams.map((parameter) => ({
          key: parameter.name,
          // 멱등 키는 보낼 때마다 새로 만듦
          value: parameter.name === IDEMPOTENCY_HEADER ? '{{$guid}}' : '',
        })),
      ],
      url: {
        raw: `{{baseUrl}}${postmanPath}`,
        host: ['{{baseUrl}}'],
        path: segments,
        query: query.map((parameter) => ({
          key: parameter.name,
          value: '',
          disabled: !parameter.required,
        })),
        variable: pathVariables.map((parameter) => ({
          key: parameter.name,
          value: '',
          description: '필수',
        })),
      },
      ...(bodySchema
        ? {
            body: {
              mode: 'raw',
              raw:
                apiPath === LOGIN_PATH
                  ? LOGIN_BODY
                  : JSON.stringify(exampleOf(bodySchema), null, 2),
              options: { raw: { language: 'json' } },
            },
          }
        : {}),
      description: describe(method, op, bodySchema),
    },
  };
};

// 상태를 바꾸는 요청에 웹 클라이언트 헤더와 Origin을 채움 (서버 CSRF 검사 통과용)
const PREREQUEST = [
  "const safe = ['GET', 'HEAD', 'OPTIONS'];",
  'if (!safe.includes(pm.request.method)) {',
  "  pm.request.headers.upsert({ key: 'X-Field-Note-Client', value: 'web' });",
  "  pm.request.headers.upsert({ key: 'Origin', value: pm.environment.get('appOrigin') });",
  '}',
];

const buildCollection = (document: OpenApi) => {
  const folders = new Map<string, ReturnType<typeof buildItem>[]>();

  for (const [apiPath, item] of Object.entries(document.paths)) {
    for (const method of METHODS) {
      const op = item[method];

      if (!op) continue;

      const tag = op.tags?.[0] ?? '기타';

      folders.set(tag, [...(folders.get(tag) ?? []), buildItem(apiPath, method, op)]);
    }
  }

  return {
    info: {
      name: 'field-note',
      description: [
        document.info.description ?? '',
        '',
        '환경: field-note-local(로컬) / field-note-prod(운영)을 오른쪽 위에서 고릅니다.',
        '순서: 환경의 loginId·password(secret)를 채우고 "로그인·가입 > 아이디 로그인"을 보내면 세션 쿠키(sid)가 저장됩니다.',
        '이 컬렉션은 pnpm postman:generate로 openapi.json에서 만든 것이라 직접 고치지 않습니다.',
      ].join('\n'),
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: PREREQUEST } }],
    item: [...folders.entries()].map(([name, items]) => ({ name, item: items })),
  };
};

const buildEnvironment = (name: string, baseUrl: string, appOrigin: string, note: string) => ({
  name,
  values: [
    { key: 'baseUrl', value: baseUrl, type: 'default', enabled: true, description: note },
    {
      key: 'appOrigin',
      value: appOrigin,
      type: 'default',
      enabled: true,
      description: '서버가 허용하는 웹 주소(Origin). 상태를 바꾸는 요청에 자동으로 실립니다',
    },
    { key: 'loginId', value: '', type: 'secret', enabled: true, description: '로그인 아이디' },
    { key: 'password', value: '', type: 'secret', enabled: true, description: '로그인 비밀번호' },
  ],
});

const document = JSON.parse(await readFile(OPENAPI_PATH, 'utf8')) as OpenApi;

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, 'field-note.postman_collection.json'),
  `${JSON.stringify(buildCollection(document), null, 2)}\n`,
);
await writeFile(
  path.join(OUTPUT_DIR, 'field-note-local.postman_environment.json'),
  `${JSON.stringify(
    buildEnvironment(
      'field-note-local',
      'http://localhost:3000',
      'http://localhost:5173',
      '로컬 api 주소 (pnpm dev)',
    ),
    null,
    2,
  )}\n`,
);
await writeFile(
  path.join(OUTPUT_DIR, 'field-note-prod.postman_environment.json'),
  `${JSON.stringify(
    buildEnvironment(
      'field-note-prod',
      'https://SITE_ADDRESS를_운영_주소로_바꾸세요',
      'https://SITE_ADDRESS를_운영_주소로_바꾸세요',
      '운영 서버 주소 (SITE_ADDRESS). 운영 데이터가 바뀌므로 신중히 사용',
    ),
    null,
    2,
  )}\n`,
);
console.log('[generate-postman] 생성 완료: postman/');
