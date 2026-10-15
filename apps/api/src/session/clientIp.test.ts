import { clientIp } from './clientIp';

describe('clientIp', () => {
  it('IPv4를 감싼 IPv6 표기는 IPv4로 풀고 나머지는 그대로 둔다', () => {
    expect(clientIp({ ip: '::ffff:203.0.113.5' })).toBe('203.0.113.5');
    expect(clientIp({ ip: '203.0.113.5' })).toBe('203.0.113.5');
    expect(clientIp({ ip: '2001:db8::1' })).toBe('2001:db8::1');
    expect(clientIp({ ip: '::1' })).toBe('::1');
  });

  it('IP를 모르면 undefined', () => {
    expect(clientIp({ ip: undefined })).toBeUndefined();
    expect(clientIp({ ip: '  ' })).toBeUndefined();
  });
});
