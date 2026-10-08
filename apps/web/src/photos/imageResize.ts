// 올리기 전 압축 기준 (기술 기획서 부록: 긴 변 2,000px, JPEG)
export const PHOTO_MAX_SIDE = 2000;
export const PHOTO_JPEG_QUALITY = 0.85;

export class ImageConvertError extends Error {
  constructor() {
    super('[web.imageResize] 이미지를 읽을 수 없습니다');
  }
}

/**
 * @description 긴 변이 최대 길이를 넘으면 비율을 지켜 줄인 크기 (작은 이미지는 키우지 않음)
 * @param width 원본 가로
 * @param height 원본 세로
 * @param maxSide 긴 변의 최대 길이
 * @returns 줄인 가로·세로 (정수)
 */
export const fitWithin = (width: number, height: number, maxSide = PHOTO_MAX_SIDE) => {
  const longest = Math.max(width, height);

  if (longest <= maxSide) {
    return { width, height };
  }

  const scale = maxSide / longest;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * @description 사진을 JPEG로 변환·압축 (HEIC 등 브라우저가 열 수 있는 형식을 서버가 받는 JPEG로 바꿈, 회전 정보는 화면에 맞춰 반영).
 * 위치 정보(EXIF)는 변환 과정에서 빠진다
 * @param file 사용자가 고른 사진
 * @returns 압축한 JPEG와 크기
 * @throws 브라우저가 열 수 없는 형식이면 ImageConvertError
 */
export const compressImage = async (file: Blob) => {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageConvertError();
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY),
  );

  if (!blob) {
    throw new ImageConvertError();
  }

  return { blob, width, height };
};
