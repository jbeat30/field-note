import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// 주석 규칙 점검: 명사형 종결, 마침표 금지 (jbeat-conventions comment-conventions)
// 사용: pnpm check:comments [--all]  (기본은 변경한 파일만, --all은 저장소 전체)
const all = process.argv.includes('--all');
const names = execSync(all ? 'git ls-files' : 'git diff --name-only HEAD', { encoding: 'utf8' })
  .split('\n')
  .filter((file) => /\.(ts|tsx|sql|prisma|mjs|cjs)$/.test(file))
  // 적용된 마이그레이션은 파일이 바뀌면 체크섬이 어긋나므로 점검 대상에서 제외
  .filter((file) => !file.includes('/migrations/'))
  .filter((file) => !file.includes('generated') && !file.endsWith('schema.d.ts'));
// 서술형 종결 어미: 다로 끝나는 모든 서술형(한다·이다·합니다 등), 필요·개요처럼 명사로 끝나는 말은 대상 아님
const VERB_ENDING = /(다|해요|이에요|예요|세요)$/;
const MID_VERB = /[가-힣](?<!마)다(?:[,;] | \()/;
const NOUN_ENDING_EXCEPTIONS = /(필요|불필요|중요|마다)$/;
const findings = [];

for (const file of names) {
  let text;

  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  text.split('\n').forEach((line, index) => {
    const match =
      line.match(/^\s*(?:\/\/|--|\*|\/\*\*)\s?(.*)$/) ?? line.match(/\s(?:\/\/|--)\s(.*)$/);

    if (!match) return;

    const body = match[1].trim().replace(/\*\/$/, '').trim();

    // JSDoc 태그(@description·@param 이름·@returns)는 뒤따르는 설명만 검사
    const text = body
      .replace(/^@(?:description|returns?|throws)\s*/, '')
      .replace(/^@param\s+\S+\s*/, '');

    if (!text || text.startsWith('@') || !/[가-힣]/.test(text)) return;

    const bare = text.replace(/[)\]]+$/, '');
    // 문장 중간의 서술형(쉼표·괄호 앞의 다)도 같은 규칙으로 취급
    const hasVerb =
      (VERB_ENDING.test(bare) && !NOUN_ENDING_EXCEPTIONS.test(bare)) || MID_VERB.test(text);
    const hasPeriod = /[가-힣)]\.$/.test(text) || /[가-힣)]\. [가-힣(]/.test(text);

    if (hasVerb || hasPeriod) findings.push(`${file}:${index + 1}: ${body}`);
  });
}

if (findings.length > 0) {
  console.log(`주석 규칙 위반 후보 ${findings.length}줄 (명사형 종결, 마침표 금지)`);
  console.log(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('주석 규칙 위반 후보 없음');
}
