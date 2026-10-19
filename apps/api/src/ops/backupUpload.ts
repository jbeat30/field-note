import { readFile } from 'node:fs/promises';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// 서버 밖(별도 버킷)으로 백업 사본을 보내는 설정, 서비스가 쓰는 업로드 버킷과 접속 정보를 분리해 한쪽이 뚫려도 다른 쪽은 안전하게 함
export type BackupRemoteConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

const FIELDS = {
  endpoint: 'BACKUP_S3_ENDPOINT',
  bucket: 'BACKUP_S3_BUCKET',
  accessKey: 'BACKUP_S3_ACCESS_KEY',
  secretKey: 'BACKUP_S3_SECRET_KEY',
} as const;

// 한 번에 올릴 수 있는 파일 크기 (메모리에 올려 보내므로 넘으면 분할 업로드 방식으로 바꿔야 함)
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

/**
 * @description 환경 변수에서 서버 밖 백업 저장소 설정 읽기
 * @param env 환경 변수
 * @returns 설정, 하나도 없으면 null (사본 보내기 꺼짐)
 * @throws 일부만 있을 때 (잘못 설정한 채 백업이 서버 안에만 남는 일을 막음)
 */
export const readBackupRemoteConfig = (
  env: Record<string, string | undefined>,
): BackupRemoteConfig | null => {
  const names = Object.values(FIELDS);
  const present = names.filter((name) => Boolean(env[name]));

  if (present.length === 0) {
    return null;
  }

  const missing = names.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`[ops.backupUpload] 서버 밖 백업 저장소 설정이 모자람: ${missing.join(', ')}`);
  }

  const endpoint = env[FIELDS.endpoint]!;

  // 백업 파일과 접근 키가 오가므로 https만 허용, 점검용 로컬 저장소만 예외
  if (!/^(https:\/\/[^/\s]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(endpoint)) {
    throw new Error('[ops.backupUpload] BACKUP_S3_ENDPOINT는 https 주소여야 함');
  }

  return {
    endpoint,
    region: env.BACKUP_S3_REGION || 'auto',
    bucket: env[FIELDS.bucket]!,
    accessKey: env[FIELDS.accessKey]!,
    secretKey: env[FIELDS.secretKey]!,
  };
};

/**
 * @description 백업 사본 업로더 (S3 호환 저장소), 올리기만 하고 지우거나 덮어쓰지 않음
 * @param config 접속 설정
 * @returns 업로드와 연결 확인 함수
 */
export const createBackupUploader = (config: BackupRemoteConfig) => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  const Bucket = config.bucket;

  const put = (key: string, body: Buffer, contentType: string) =>
    client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));

  return {
    /**
     * @description 백업 폴더의 파일을 `<접두사>/<파일 이름>`으로 올리고 크기가 맞는지 확인
     * @param prefix 저장소 안의 위치 (예: `field-note/20261006T030000Z`)
     * @param files 올릴 파일 경로 목록
     */
    upload: async (prefix: string, files: { path: string; name: string }[]) => {
      for (const file of files) {
        const body = await readFile(file.path);

        if (body.length > MAX_UPLOAD_BYTES) {
          throw new Error(`[ops.backupUpload] ${file.name}이 너무 큼 (${body.length}바이트)`);
        }

        const key = `${prefix}/${file.name}`;

        await put(key, body, 'application/octet-stream');

        const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));

        if (head.ContentLength !== body.length) {
          throw new Error(`[ops.backupUpload] ${key} 올린 크기가 다름`);
        }
      }
    },
    // 접속 정보와 권한 확인: 작은 확인용 파일을 올리고 있는지 확인
    check: async (prefix: string) => {
      const key = `${prefix}/_connection-check-${Date.now()}.txt`;
      const body = Buffer.from('field-note backup connection check\n');

      await put(key, body, 'text/plain');
      await client.send(new HeadObjectCommand({ Bucket, Key: key }));

      return key;
    },
  };
};
