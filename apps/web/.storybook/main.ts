import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-themes',
    'msw-storybook-addon',
  ],
  framework: '@storybook/react-vite',
  // msw 워커 파일은 앱 public과 분리 (운영 빌드에 포함되지 않게)
  staticDirs: ['./public'],
  // 사용 통계 외부 전송 끔
  core: { disableTelemetry: true },
  // 앱의 vite.config.ts를 그대로 쓰되(Tailwind 등) PWA 플러그인은 제외 (서비스 워커 생성이 스토리북 번들과 충돌)
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: viteConfig.plugins
      ?.flat(Infinity)
      .filter(
        (plugin) => !(plugin && 'name' in plugin && plugin.name.startsWith('vite-plugin-pwa')),
      ),
  }),
};

export default config;
