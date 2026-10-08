import sharp from 'sharp';

import { createThumbnail, detectFileType, THUMBNAIL_MAX_SIZE } from './fileInspector';

const image = (format: 'jpeg' | 'png', width = 1200, height = 800) => {
  const base = sharp({ create: { width, height, channels: 3, background: '#3366cc' } });

  return (format === 'jpeg' ? base.jpeg() : base.png()).toBuffer();
};

describe('파일 내용 판별', () => {
  it('확장자와 상관없이 내용으로 형식을 알아낸다', async () => {
    expect(await detectFileType(await image('jpeg'))).toEqual({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
    expect(await detectFileType(await image('png'))).toEqual({
      mime: 'image/png',
      extension: 'png',
    });
    expect((await detectFileType(Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj')))?.mime).toBe(
      'application/pdf',
    );
  });

  it('실행 파일은 실행 파일 형식으로 판별되고 알 수 없는 내용은 null이다', async () => {
    const windowsExe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]);

    expect((await detectFileType(windowsExe))?.mime).not.toMatch(/^image\//);
    expect(await detectFileType(Buffer.from('그냥 글자'))).toBeNull();
  });
});

describe('썸네일', () => {
  it('긴 변을 줄인 WebP를 만든다', async () => {
    const thumbnail = await createThumbnail(await image('jpeg'));
    const meta = await sharp(thumbnail!).metadata();

    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(THUMBNAIL_MAX_SIZE);
    expect(meta.height).toBe(320);
  });

  it('작은 이미지는 키우지 않는다', async () => {
    const meta = await sharp((await createThumbnail(await image('png', 100, 50)))!).metadata();

    expect([meta.width, meta.height]).toEqual([100, 50]);
  });

  it('위치 정보(EXIF)를 썸네일에 넣지 않는다', async () => {
    const withExif = await sharp({
      create: { width: 600, height: 400, channels: 3, background: '#fff' },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: '비공개' } })
      .toBuffer();

    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    expect((await sharp((await createThumbnail(withExif))!).metadata()).exif).toBeUndefined();
  });

  it('이미지가 아니면 null이다', async () => {
    expect(await createThumbnail(Buffer.from('이미지 아님'))).toBeNull();
  });
});
