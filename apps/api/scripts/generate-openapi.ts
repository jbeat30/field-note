import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

import { createRegistry } from '../src/app';
import { generateOpenApiDocument } from '../src/http/openapi';

// 프론트·백엔드가 함께 쓰는 계약 산출물 위치
const OUTPUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/shared/openapi',
);
const JSON_PATH = path.join(OUTPUT_DIR, 'openapi.json');
const TYPES_PATH = path.join(OUTPUT_DIR, 'schema.d.ts');

const document = generateOpenApiDocument(createRegistry().routes);
const json = `${JSON.stringify(document, null, 2)}\n`;
const types = astToString(await openapiTS(document as Parameters<typeof openapiTS>[0]));

const isCheck = process.argv.includes('--check');

if (isCheck) {
  // 커밋된 산출물이 라우트 정의와 어긋나면 실패 (CI에서 계약 불일치 차단)
  const [savedJson, savedTypes] = await Promise.all([
    readFile(JSON_PATH, 'utf8').catch(() => ''),
    readFile(TYPES_PATH, 'utf8').catch(() => ''),
  ]);

  if (savedJson !== json || savedTypes !== types) {
    console.error('[generate-openapi] 산출물이 최신이 아님. pnpm openapi:generate 실행 필요');
    process.exit(1);
  }

  console.log('[generate-openapi] 산출물이 최신 상태');
} else {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(JSON_PATH, json);
  await writeFile(TYPES_PATH, types);
  console.log('[generate-openapi] 생성 완료');
}
