import { buildDeviceLabel } from './deviceLabel';

const UA = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsungAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
  safariIpad:
    'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

describe('buildDeviceLabel', () => {
  it.each([
    [UA.chromeMac, 'Chrome · macOS'],
    [UA.safariIphone, 'Safari · iPhone'],
    [UA.chromeAndroid, 'Chrome · Android'],
    [UA.samsungAndroid, 'Samsung Internet · Android'],
    [UA.edgeWindows, 'Edge · Windows'],
    [UA.firefoxLinux, 'Firefox · Linux'],
    [UA.safariIpad, 'Safari · iPad'],
  ])('접속 정보를 브라우저와 기기로 요약한다 (%#)', (userAgent, expected) => {
    expect(buildDeviceLabel(userAgent)).toBe(expected);
  });

  it('알 수 없거나 없는 값은 일반 문구를 쓴다', () => {
    expect(buildDeviceLabel(undefined)).toBe('알 수 없는 기기');
    expect(buildDeviceLabel('')).toBe('알 수 없는 기기');
    expect(buildDeviceLabel('curl/8.0')).toBe('알 수 없는 기기');
  });

  it('원본 접속 정보나 버전 숫자는 담지 않는다', () => {
    expect(buildDeviceLabel(UA.chromeMac)).not.toMatch(/\d/);
  });

  it('비정상적으로 긴 값도 처리한다', () => {
    expect(buildDeviceLabel(`${'x'.repeat(100_000)} Chrome/1 Macintosh`)).toBe('알 수 없는 기기');
  });
});
