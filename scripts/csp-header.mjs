// 웹 정적 호스팅(CDN)에 설정할 Content-Security-Policy 값 출력
// 사용: STORAGE_ORIGIN=https://버킷주소 node scripts/csp-header.mjs
// index.html의 인라인 스크립트(첫 화면 테마 적용)는 빌드마다 내용이 바뀔 수 있어 해시를 계산해 허용
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const storageOrigin = process.env.STORAGE_ORIGIN;

if (!storageOrigin || !/^https?:\/\/[^/\s]+$/.test(storageOrigin)) {
  console.error(
    'STORAGE_ORIGIN에 객체 저장소 주소(예: https://bucket.example.com)를 지정해 주세요',
  );
  process.exit(1);
}

const html = readFileSync(resolve(process.argv[2] ?? 'apps/web/dist/index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
const hashes = inlineScripts.map(
  ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
);

const directives = {
  'default-src': ["'self'"],
  // 모듈 스크립트와 첫 화면 테마 인라인 스크립트(해시)만 실행
  'script-src': ["'self'", ...hashes],
  // 화면 라이브러리가 요소의 style 속성을 쓰므로 인라인 스타일을 허용 (스크립트는 허용하지 않음)
  'style-src': ["'self'", "'unsafe-inline'"],
  // data: 는 2단계 인증 QR, blob: 는 사진 압축·미리보기, 저장소는 사진·문서 미리보기
  'img-src': ["'self'", 'data:', 'blob:', storageOrigin],
  'font-src': ["'self'"],
  // 사진·문서는 브라우저가 저장소로 직접 올리고 내려받음
  'connect-src': ["'self'", storageOrigin],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

console.log(
  Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; '),
);
