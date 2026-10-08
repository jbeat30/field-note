import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

// 썸네일 한 변의 최대 길이(px)
export const THUMBNAIL_MAX_SIZE = 480;

// 압축 폭탄(작은 파일이 거대한 이미지로 풀리는 공격)을 막는 최대 화소 수
const MAX_INPUT_PIXELS = 80_000_000;

export type DetectedType = { mime: string; extension: string };

/**
 * @description 확장자나 선언한 형식이 아니라 파일 내용(머리 부분의 고유 표식)으로 형식 판별
 * @param body 파일 내용
 * @returns 판별한 형식 (알 수 없으면 null)
 */
export const detectFileType = async (body: Buffer): Promise<DetectedType | null> => {
  const detected = await fileTypeFromBuffer(body);

  return detected ? { mime: detected.mime, extension: detected.ext } : null;
};

/**
 * @description 이미지 썸네일 생성 (WebP, 회전 정보 반영). 위치 정보 등 메타데이터는 썸네일에 넣지 않는다 (기술 기획서 §10)
 * @param body 이미지 원본
 * @returns 썸네일 이미지 (이미지로 열 수 없으면 null)
 */
export const createThumbnail = async (body: Buffer): Promise<Buffer | null> => {
  try {
    return await sharp(body, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: THUMBNAIL_MAX_SIZE,
        height: THUMBNAIL_MAX_SIZE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();
  } catch {
    return null;
  }
};
