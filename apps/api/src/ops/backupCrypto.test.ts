import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { createEncryptStream, decryptFile, parseBackupKey } from './backupCrypto';

const workDir = mkdtempSync(path.join(tmpdir(), 'backup-crypto-'));

const encryptTo = async (plain: Buffer, file: string, key: Buffer) => {
  await pipeline(
    Readable.from([plain.subarray(0, 1000), plain.subarray(1000)]),
    createEncryptStream(key),
    createWriteStream(file),
  );
};

describe('백업 암호화 키', () => {
  it('32바이트 키만 받고 값이 없으면 null', () => {
    const key = randomBytes(32);

    expect(parseBackupKey(key.toString('base64url'))?.equals(key)).toBe(true);
    expect(parseBackupKey(undefined)).toBeNull();
    expect(parseBackupKey('')).toBeNull();
    expect(() => parseBackupKey(randomBytes(16).toString('base64url'))).toThrow('32바이트');
  });
});

describe('백업 파일 암호화', () => {
  const key = randomBytes(32);
  const plain = randomBytes(5000);

  it('암호화한 파일에는 원문이 보이지 않고 같은 키로 풀면 원문으로 돌아온다', async () => {
    const encrypted = path.join(workDir, 'a.enc');
    const restored = path.join(workDir, 'a.dump');

    await encryptTo(plain, encrypted, key);

    expect(readFileSync(encrypted).includes(plain.subarray(0, 64))).toBe(false);

    await decryptFile(encrypted, restored, key);

    expect(readFileSync(restored).equals(plain)).toBe(true);
  });

  it('다른 키로는 풀리지 않고 덜 쓴 파일을 남기지 않는다', async () => {
    const encrypted = path.join(workDir, 'b.enc');
    const restored = path.join(workDir, 'b.dump');

    await encryptTo(plain, encrypted, key);

    await expect(decryptFile(encrypted, restored, randomBytes(32))).rejects.toThrow('복호화 실패');
    expect(existsSync(restored)).toBe(false);
  });

  it('내용을 한 바이트만 바꿔도 풀리지 않는다', async () => {
    const encrypted = path.join(workDir, 'c.enc');
    const restored = path.join(workDir, 'c.dump');

    await encryptTo(plain, encrypted, key);

    const bytes = readFileSync(encrypted);

    bytes[100] = bytes[100]! ^ 0xff;
    writeFileSync(encrypted, bytes);

    await expect(decryptFile(encrypted, restored, key)).rejects.toThrow('복호화 실패');
    expect(existsSync(restored)).toBe(false);
  });

  it('암호화 파일이 아니면 알려 준다', async () => {
    const notEncrypted = path.join(workDir, 'd.dump');

    writeFileSync(notEncrypted, randomBytes(200));

    await expect(decryptFile(notEncrypted, path.join(workDir, 'd.out'), key)).rejects.toThrow(
      '암호화된 백업 파일이 아님',
    );
  });
});
