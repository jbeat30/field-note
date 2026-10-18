/* global document, matchMedia */
// 첫 화면이 깜빡이지 않게 저장된 테마(없으면 기기 설정)를 먼저 적용, 인라인 스크립트를 금지하는 CSP를 위해 별도 파일로 둠
try {
  const mode = localStorage.getItem('field-note-theme');
  const dark =
    mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

  if (dark) {
    document.documentElement.classList.add('dark');
  }
} catch {
  // 저장소를 쓸 수 없으면 기본 테마
}
