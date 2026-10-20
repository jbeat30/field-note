import { readBackupRemoteConfig } from './backupUpload';

const full = {
  BACKUP_S3_ENDPOINT: 'https://abc.r2.cloudflarestorage.com',
  BACKUP_S3_BUCKET: 'field-note-backup',
  BACKUP_S3_ACCESS_KEY: 'access',
  BACKUP_S3_SECRET_KEY: 'secret',
};

describe('서버 밖 백업 저장소 설정', () => {
  it('하나도 없으면 꺼진 상태(null)', () => {
    expect(readBackupRemoteConfig({})).toBeNull();
  });

  it('모두 있으면 지역을 auto로 두고 설정을 돌려준다', () => {
    expect(readBackupRemoteConfig(full)).toEqual({
      endpoint: 'https://abc.r2.cloudflarestorage.com',
      region: 'auto',
      bucket: 'field-note-backup',
      accessKey: 'access',
      secretKey: 'secret',
    });
  });

  it('일부만 있으면 빠진 이름을 알려 주며 실패한다', () => {
    expect(() => readBackupRemoteConfig({ ...full, BACKUP_S3_SECRET_KEY: undefined })).toThrow(
      'BACKUP_S3_SECRET_KEY',
    );
  });

  it('평문 http 주소는 거부하고 점검용 로컬 주소만 허용한다', () => {
    expect(() =>
      readBackupRemoteConfig({ ...full, BACKUP_S3_ENDPOINT: 'http://storage.example.com' }),
    ).toThrow('https');
    expect(
      readBackupRemoteConfig({ ...full, BACKUP_S3_ENDPOINT: 'http://localhost:9000' }),
    ).not.toBeNull();
  });
});
