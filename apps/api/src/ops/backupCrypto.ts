import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

// 백업 파일 암호화: AES-256-GCM, 파일 형식은 [매직 5바이트][IV 12바이트][암호문][인증 태그 16바이트]
// 태그가 맞지 않으면(키가 다르거나 파일이 바뀌었으면) 복호화가 실패해 손상·변조를 잡음
const MAGIC = Buffer.from('FNBK1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + IV_LENGTH;
const KEY_LENGTH = 32;

export const ENCRYPTED_SUFFIX = '.enc';

/**
 * @description 환경 변수 값에서 백업 암호화 키 읽기 (base64url 또는 base64로 인코딩한 32바이트)
 * @param value `BACKUP_ENCRYPTION_KEY` 값
 * @returns 키, 값이 없으면 null
 * @throws 값이 있는데 32바이트가 아닐 때
 */
export const parseBackupKey = (value: string | undefined): Buffer | null => {
  if (!value) {
    return null;
  }

  const key = Buffer.from(value, 'base64url');

  if (key.length !== KEY_LENGTH) {
    throw new Error(`[ops.backupCrypto] BACKUP_ENCRYPTION_KEY는 ${KEY_LENGTH}바이트(base64) 필요`);
  }

  return key;
};

/**
 * @description 흘려보내는 데이터를 암호화하는 변환 스트림 (큰 덤프를 메모리에 올리지 않고 평문을 디스크에 남기지 않음)
 * @param key 32바이트 키
 * @returns 헤더, 암호문, 인증 태그를 차례로 내보내는 스트림
 */
export const createEncryptStream = (key: Buffer) => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let started = false;

  const start = (stream: Transform) => {
    if (!started) {
      started = true;
      stream.push(Buffer.concat([MAGIC, iv]));
    }
  };

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      start(this);
      callback(null, cipher.update(chunk));
    },
    flush(callback) {
      start(this);
      this.push(cipher.final());
      this.push(cipher.getAuthTag());
      callback();
    },
  });
};

/**
 * @description 암호화한 백업 파일을 풀어 다른 파일로 저장, 실패하면 덜 쓴 파일을 지움
 * @param source 암호화된 파일
 * @param destination 복호화한 파일 경로
 * @param key 32바이트 키
 * @throws 형식이 아니거나 키가 다르거나 내용이 바뀌었을 때
 */
export const decryptFile = async (source: string, destination: string, key: Buffer) => {
  const handle = await open(source, 'r');

  try {
    const { size } = await handle.stat();

    if (size <= HEADER_LENGTH + TAG_LENGTH) {
      throw new Error('[ops.backupCrypto] 암호화된 백업 파일이 아님 (크기 부족)');
    }

    const header = Buffer.alloc(HEADER_LENGTH);
    const tag = Buffer.alloc(TAG_LENGTH);

    await handle.read(header, 0, HEADER_LENGTH, 0);
    await handle.read(tag, 0, TAG_LENGTH, size - TAG_LENGTH);

    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error('[ops.backupCrypto] 암호화된 백업 파일이 아님 (형식 표시 불일치)');
    }

    const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));

    decipher.setAuthTag(tag);

    try {
      await pipeline(
        createReadStream(source, { start: HEADER_LENGTH, end: size - TAG_LENGTH - 1 }),
        decipher,
        createWriteStream(destination, { mode: 0o600 }),
      );
    } catch (error) {
      await rm(destination, { force: true });
      throw new Error('[ops.backupCrypto] 복호화 실패 (키가 다르거나 파일이 손상·변조됨)', {
        cause: error,
      });
    }
  } finally {
    await handle.close();
  }
};
