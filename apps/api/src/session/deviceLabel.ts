const UNKNOWN = '알 수 없는 기기';

// 앞에서부터 처음 맞는 항목 사용 (Edge·Samsung 등은 Chrome 문자열도 포함하므로 먼저 검사)
const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, 'Edge'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

// iPhone·iPad는 macOS 문자열을 함께 가지므로 먼저 검사
const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

const MAX_LENGTH = 512;

/**
 * @description 접속 정보(User-Agent)에서 사람이 알아볼 수 있는 기기 이름 생성
 * 기기 목록에서 "내 기기가 맞는지"만 알아보게 하는 용도라 브라우저와 운영체제 정도로 요약하고 나머지는 저장하지 않음
 * @param userAgent User-Agent 헤더 값
 * @returns 예: Chrome · macOS (알 수 없으면 "알 수 없는 기기")
 */
export const buildDeviceLabel = (userAgent: string | undefined) => {
  const value = (userAgent ?? '').slice(0, MAX_LENGTH);
  const browser = BROWSERS.find(([pattern]) => pattern.test(value))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(value))?.[1];

  if (browser && system) {
    return `${browser} · ${system}`;
  }

  return browser ?? system ?? UNKNOWN;
};
