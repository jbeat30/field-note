import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // 운영과 같은 도메인 구성을 맞추기 위해 /api를 api 서버로 전달
    proxy: { '/api': 'http://localhost:3000' },
  },
});
