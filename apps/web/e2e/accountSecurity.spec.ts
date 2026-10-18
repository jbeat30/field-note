import { createHmac } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { DEMO_LOGIN, login } from './helpers';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// 인증 앱이 하는 계산을 그대로 흉내 (RFC 6238, SHA-1, 6자리, 30초)
const totpCode = (secret: string, offsetSeconds = 0) => {
  let bits = 0;
  let value = 0;
  const key: number[] = [];

  for (const char of secret.replace(/\s/g, '').toUpperCase()) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;

    if (bits >= 8) {
      key.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  const counter = Buffer.alloc(8);

  counter.writeBigUInt64BE(BigInt(Math.floor((Date.now() / 1000 + offsetSeconds) / 30)));

  const digest = createHmac('sha1', Buffer.from(key)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary =
    ((digest[offset]! & 127) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;

  return String(binary % 1_000_000).padStart(6, '0');
};

const logout = async (page: Page) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
};

// 로그인 요청 제한(1분에 10번) 안에서 끝나도록 로그인 횟수를 줄이고, 다른 시험의 로그인과 겹치지 않게 파일 이름을 앞 순서로 둠
// 시험이 끝나면 2단계 인증을 꺼서 다른 시험의 로그인에 영향이 없게 함
test('2단계 인증을 켜면 로그인에 인증 코드가 필요하고, 복구 코드로 끌 수 있다', async ({
  page,
}) => {
  await login(page);
  await page.goto('/settings');

  // 켜기: 인증 앱 등록 → 6자리 코드 확인 → 복구 코드 저장 확인
  await page.getByRole('button', { name: '2단계 인증 켜기' }).click();

  const setup = page.getByRole('dialog', { name: '2단계 인증 켜기' });
  const secret = (await setup.getByLabel('인증 키').innerText()).replace(/\s/g, '');

  await expect(setup.getByAltText('인증 앱 등록 QR 코드')).toBeVisible();
  await setup.getByLabel('인증 앱의 6자리 코드').fill('000000');
  await setup.getByRole('button', { name: '확인하고 켜기' }).click();
  await expect(setup.getByText('인증 코드가 올바르지 않습니다')).toBeVisible();
  await setup.getByLabel('인증 앱의 6자리 코드').fill(totpCode(secret));
  await setup.getByRole('button', { name: '확인하고 켜기' }).click();

  const codesDialog = page.getByRole('dialog', { name: '복구 코드' });
  await expect(codesDialog.getByRole('listitem')).toHaveCount(8);

  const recoveryCodes = await codesDialog.getByRole('listitem').allInnerTexts();

  await expect(codesDialog.getByRole('button', { name: '완료' })).toBeDisabled();
  await codesDialog.getByRole('checkbox').check();
  await codesDialog.getByRole('button', { name: '완료' }).click();
  await expect(page.getByText('켜짐 · 복구 코드 8개 남음')).toBeVisible();

  // 로그인: 비밀번호만으로는 통과하지 못하고 인증 코드 칸이 열림
  await logout(page);
  await page.getByLabel('아이디').fill(DEMO_LOGIN.loginId);
  await page.getByLabel('비밀번호').fill(DEMO_LOGIN.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByLabel('인증 코드')).toBeFocused();
  await expect(page).toHaveURL(/\/login/);

  // 맞는 코드면 통과 (등록에 쓴 구간은 재사용할 수 없어 다음 구간의 코드를 사용, 틀린 코드는 단위·스토리 시험이 확인)
  await page.getByLabel('인증 코드').fill(totpCode(secret, 30));
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('heading', { name: '한빛판금' })).toBeVisible();

  // 끄기: 복구 코드로 본인 확인 (한 번 쓴 복구 코드는 소모됨)
  await page.goto('/settings');
  await page.getByRole('button', { name: '2단계 인증 끄기' }).click();

  const disable = page.getByRole('dialog', { name: '2단계 인증 끄기' });

  await disable.getByLabel('현재 비밀번호').fill(DEMO_LOGIN.password);
  await disable.getByLabel('인증 코드').fill(recoveryCodes[0]!);
  await disable.getByRole('button', { name: '2단계 인증 끄기' }).click();
  await expect(page.getByText(/꺼짐 · 켜면 로그인할 때/)).toBeVisible();

  // 꺼진 뒤에는 이전처럼 비밀번호만으로 로그인됨
  await logout(page);
  await login(page);
});
