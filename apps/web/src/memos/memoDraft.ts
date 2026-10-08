// 작성 중인 메모를 기기에 임시 저장하는 키 (통신이 불안정한 곳에서도 글이 유실되지 않게, 서비스 기획서 §14)
// 화면마다 쓰던 글이 섞이지 않도록 저장 위치(메모함 / 프로젝트)별로 나눈다
export const memoDraftKey = (projectId?: string) => `memo:${projectId ?? 'inbox'}`;
