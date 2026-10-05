import { execFileSync } from 'node:child_process';
import path from 'node:path';

import type { Router } from 'express';

import { createApp, createRegistry } from '../app';

import { API_PREFIX, generateOpenApiDocument } from './openapi';

type Layer = {
  route?: { path: string; methods: Record<string, boolean> };
  handle?: { stack?: Layer[] };
  matchers?: unknown;
};

// 앱에 실제로 붙은 라우트(메서드+경로)를 라우터 스택에서 수집
const collectRoutes = (router: Router, prefix: string): string[] => {
  const stack = (router as unknown as { stack: Layer[] }).stack;

  return stack.flatMap((layer) => {
    if (layer.route) {
      return Object.keys(layer.route.methods).map(
        (method) => `${method} ${prefix}${layer.route!.path}`,
      );
    }

    return [];
  });
};

describe('OpenAPI 계약', () => {
  it('등록된 라우트와 문서 경로가 일치한다', () => {
    const registry = createRegistry();
    const document = generateOpenApiDocument(registry.routes);
    const documented = Object.entries(document.paths ?? {}).flatMap(([docPath, item]) =>
      Object.keys(item as object)
        .filter((key) => ['get', 'post', 'put', 'patch', 'delete'].includes(key))
        .map((method) => `${method} ${docPath.replace(/\{(\w+)\}/g, ':$1')}`),
    );
    const mounted = collectRoutes(registry.router, API_PREFIX);

    expect(mounted.sort()).toEqual(documented.sort());
  });

  it('앱 루트에는 등록소 밖 라우트가 직접 붙어 있지 않다', () => {
    const app = createApp() as unknown as { router: Router };
    const directRoutes = collectRoutes(app.router, '');

    expect(directRoutes).toEqual([]);
  });

  it('커밋된 openapi.json·schema.d.ts가 최신이다', () => {
    const apiRoot = path.resolve(__dirname, '../..');

    expect(() =>
      execFileSync('pnpm', ['exec', 'tsx', 'scripts/generate-openapi.ts', '--check'], {
        cwd: apiRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});

// 회사 ID는 세션에서만 얻으므로 어떤 요청 입력(경로·쿼리·헤더·본문)에도 회사 ID 필드가 없어야 한다
describe('회사 ID 입력 경로 없음', () => {
  const COMPANY_FIELD = /company/i;

  const collectPropertyNames = (schema: unknown): string[] => {
    if (!schema || typeof schema !== 'object') {
      return [];
    }

    const node = schema as {
      properties?: Record<string, unknown>;
      items?: unknown;
      allOf?: unknown[];
      oneOf?: unknown[];
      anyOf?: unknown[];
    };
    const nested = [
      node.items,
      ...(node.allOf ?? []),
      ...(node.oneOf ?? []),
      ...(node.anyOf ?? []),
    ];

    return [
      ...Object.keys(node.properties ?? {}),
      ...Object.values(node.properties ?? {}).flatMap(collectPropertyNames),
      ...nested.flatMap(collectPropertyNames),
    ];
  };

  it('경로·쿼리·헤더 매개변수와 요청 본문에 회사 ID 필드가 없다', () => {
    const document = generateOpenApiDocument(createRegistry().routes);
    const inputNames: string[] = [];

    for (const [apiPath, item] of Object.entries(document.paths ?? {})) {
      inputNames.push(...(apiPath.match(/\{(\w+)\}/g) ?? []));

      for (const operation of Object.values(item as Record<string, unknown>)) {
        const { parameters = [], requestBody } = operation as {
          parameters?: { name: string }[];
          requestBody?: { content?: Record<string, { schema?: unknown }> };
        };

        inputNames.push(...parameters.map((parameter) => parameter.name));
        inputNames.push(
          ...Object.values(requestBody?.content ?? {}).flatMap((media) =>
            collectPropertyNames(media.schema),
          ),
        );
      }
    }

    expect(inputNames.filter((name) => COMPANY_FIELD.test(name))).toEqual([]);
  });
});
