import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 객체 저장소 추상화: 업무 코드는 S3 SDK를 직접 알지 않고 이 인터페이스만 사용 (공급자 교체·테스트 용이, 기술 기획서 §10)
export type ObjectStorage = {
  // 브라우저가 직접 올릴 짧은 만료의 PUT 주소. 형식·크기를 서명에 포함해 신청과 다른 파일은 저장소가 거부
  presignUpload: (
    key: string,
    options: { contentType: string; size: number; expiresInSeconds: number },
  ) => Promise<{ url: string; headers: Record<string, string> }>;
  // 권한 확인 뒤 서버가 발급하는 짧은 만료의 내려받기 주소
  presignDownload: (
    key: string,
    options: { expiresInSeconds: number; fileName?: string },
  ) => Promise<string>;
  // 객체 크기 (없으면 null)
  size: (key: string) => Promise<number | null>;
  read: (key: string) => Promise<Buffer>;
  write: (key: string, body: Buffer, contentType: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  // 접두사 아래 모든 객체 삭제 (회사 삭제용), 지운 개수 반환
  removePrefix: (prefix: string) => Promise<number>;
};

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

const isNotFound = (error: unknown) =>
  error instanceof S3ServiceException &&
  (error.$metadata.httpStatusCode === 404 ||
    error.name === 'NotFound' ||
    error.name === 'NoSuchKey');

// Content-Disposition에 넣을 수 있게 파일 이름을 RFC 5987 형식으로 인코딩 (한글 이름 대응)
const attachmentDisposition = (fileName: string) =>
  `attachment; filename*=UTF-8''${encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;

/**
 * @description S3 호환 객체 저장소 (로컬 RustFS, 운영 공급자는 값만 교체)
 * @param config 접속 설정
 * @returns 객체 저장소와 버킷 준비 함수
 */
export const createS3Storage = (config: S3Config) => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    // S3 호환 저장소는 버킷을 주소 앞이 아니라 경로로 구분
    forcePathStyle: true,
    // 호환 저장소가 모르는 체크섬 헤더가 주소에 붙지 않게 함
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  const Bucket = config.bucket;

  const storage: ObjectStorage = {
    presignUpload: async (key, { contentType, size, expiresInSeconds }) => ({
      url: await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ContentLength: size }),
        {
          expiresIn: expiresInSeconds,
          // 형식과 크기를 서명에 포함 (브라우저는 Content-Length를 직접 정하므로 헤더로 돌려주지 않음)
          signableHeaders: new Set(['content-type', 'content-length']),
        },
      ),
      headers: { 'Content-Type': contentType },
    }),
    presignDownload: (key, { expiresInSeconds, fileName }) =>
      getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket,
          Key: key,
          ResponseContentDisposition: fileName ? attachmentDisposition(fileName) : undefined,
        }),
        { expiresIn: expiresInSeconds },
      ),
    size: async (key) => {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));

        return head.ContentLength ?? null;
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }

        throw error;
      }
    },
    read: async (key) => {
      const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));

      return Buffer.from(await object.Body!.transformToByteArray());
    },
    write: async (key, body, contentType) => {
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    remove: async (key) => {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    removePrefix: async (prefix) => {
      let removed = 0;
      let token: string | undefined;

      do {
        const page = await client.send(
          new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }),
        );
        const keys = (page.Contents ?? []).map((object) => ({ Key: object.Key! }));

        if (keys.length > 0) {
          await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys } }));
          removed += keys.length;
        }

        token = page.NextContinuationToken;
      } while (token);

      return removed;
    },
  };

  // 버킷이 없으면 만든다 (로컬 개발용. 운영은 운영자가 버킷을 미리 준비)
  const ensureBucket = async () => {
    try {
      await client.send(new HeadBucketCommand({ Bucket }));
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }

      await client.send(new CreateBucketCommand({ Bucket }));
    }
  };

  return { storage, ensureBucket };
};

/**
 * @description 메모리 객체 저장소 (DB·저장소 없는 단위 테스트용). 주소는 가짜지만 형식·크기 서명 값을 기록해 둠
 * @returns 객체 저장소와 테스트용 조작 함수
 */
export const createMemoryStorage = () => {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  const presigned = new Map<string, { contentType: string; size: number }>();

  const storage: ObjectStorage = {
    presignUpload: async (key, { contentType, size, expiresInSeconds }) => {
      presigned.set(key, { contentType, size });

      return {
        url: `http://storage.test/${key}?upload&expires=${expiresInSeconds}`,
        headers: { 'Content-Type': contentType },
      };
    },
    presignDownload: async (key, { expiresInSeconds }) =>
      `http://storage.test/${key}?download&expires=${expiresInSeconds}`,
    size: async (key) => objects.get(key)?.body.length ?? null,
    read: async (key) => {
      const object = objects.get(key);

      if (!object) {
        throw new Error(`[storage.memory] 객체 없음: ${key}`);
      }

      return object.body;
    },
    write: async (key, body, contentType) => {
      objects.set(key, { body, contentType });
    },
    remove: async (key) => {
      objects.delete(key);
    },
    removePrefix: async (prefix) => {
      const keys = [...objects.keys()].filter((key) => key.startsWith(prefix));

      keys.forEach((key) => objects.delete(key));

      return keys.length;
    },
  };

  return {
    storage,
    objects,
    presigned,
    // 브라우저가 주소로 올린 것처럼 객체를 넣음
    upload: (key: string, body: Buffer, contentType = 'application/octet-stream') => {
      objects.set(key, { body, contentType });
    },
  };
};
