// 로그인 잠금 정책 ("로그인 실패가 반복되면 일정 시간 잠근다")
// 계정 하나가 모든 데이터를 열기 때문에 보수적으로 두되, 잠금 자체가 괴롭힘 수단이 되지 않게 시간은 짧게 유지

// 연속 실패 허용 횟수 (이 횟수에 도달하면 잠금)
export const MAX_FAILED_LOGINS = 5;

// 잠금 시간
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

// 로그인 유지를 선택한 세션의 유효 시간 (로그인 시각부터 고정, 사용해도 연장되지 않음)
export const REMEMBERED_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

// 로그인 유지를 선택하지 않은 세션의 절대 유효 시간 (쿠키는 브라우저를 닫으면 사라짐)
export const SHORT_SESSION_MS = 12 * 60 * 60 * 1000;

// 로그인 유지를 선택하지 않은 세션의 미사용 만료 시간 (사용할 때마다 연장)
export const SHORT_SESSION_IDLE_MS = 60 * 60 * 1000;

// 세션 토큰 교체 간격 (사용 중인 세션의 토큰을 이 간격마다 새로 발급, 훔친 토큰이 쓰일 수 있는 시간을 줄임)
export const SESSION_ROTATE_INTERVAL_MS = 60 * 60 * 1000;

// 교체 직전 토큰을 계속 허용하는 시간 (교체 응답이 유실되거나 동시 요청이 이전 토큰을 들고 있는 경우)
export const ROTATION_GRACE_MS = 5 * 60 * 1000;
