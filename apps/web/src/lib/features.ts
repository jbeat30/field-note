// 소셜 로그인은 서비스 연결 전까지 화면에서 숨김 (로그인·가입·설정), 연결 뒤 VITE_SOCIAL_LOGIN=true로 켬
export const IS_SOCIAL_LOGIN_ENABLED = import.meta.env['VITE_SOCIAL_LOGIN'] === 'true';
