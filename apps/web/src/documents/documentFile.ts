import { ALLOWED_FILE_TYPES, fileExtension } from '@field-note/shared';

/**
 * @description 확장자로 문서 파일의 형식(mime)을 정함. 브라우저가 알려 주는 형식은 기기마다 달라 믿지 않고 (서버가 올라온 내용으로 다시 확인), 허용 목록에 없으면 null
 * @param fileName 파일 이름
 * @returns 문서로 올릴 수 있는 형식 (없으면 null)
 */
export const documentContentType = (fileName: string): string | null => {
  const extension = fileExtension(fileName);

  return (
    ALLOWED_FILE_TYPES.find(
      (type) => type.purposes.includes('DOCUMENT') && type.extensions.includes(extension),
    )?.mime ?? null
  );
};

/**
 * @description 파일 이름에서 확장자를 뺀 문서 이름 제안 (이름 칸의 기본값)
 * @param fileName 파일 이름
 * @returns 확장자 없는 이름 (모두 지워지면 원래 이름)
 */
export const titleFromFileName = (fileName: string) => {
  const base = fileName.replace(/\.[^.]*$/, '').trim();

  return base || fileName;
};

// 입력 칸의 accept 값 (파일 선택창에서 문서 형식만 보이게)
export const DOCUMENT_ACCEPT = ALLOWED_FILE_TYPES.filter((type) =>
  type.purposes.includes('DOCUMENT'),
)
  .flatMap((type) => type.extensions.map((extension) => `.${extension}`))
  .join(',');
