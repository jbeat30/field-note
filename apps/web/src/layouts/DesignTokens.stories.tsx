import type { Meta, StoryObj } from '@storybook/react-vite';

const COLORS = [
  ['primary', 'bg-primary'],
  ['primary-subtle', 'bg-primary-subtle'],
  ['surface', 'bg-surface'],
  ['surface-subtle', 'bg-surface-subtle'],
  ['muted', 'bg-muted'],
  ['foreground', 'bg-foreground'],
  ['border', 'bg-border'],
  ['danger', 'bg-danger'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
] as const;

const RADII = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'] as const;

const DesignTokens = () => (
  <div className="flex flex-col gap-6">
    <section aria-labelledby="color-title">
      <h2 id="color-title" className="mb-2 text-lg font-bold">
        색상
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {COLORS.map(([name, swatch]) => (
          <li key={name} className="flex items-center gap-2 text-sm">
            <span className={`size-8 rounded-md border border-border ${swatch}`} />
            {name}
          </li>
        ))}
      </ul>
    </section>
    <section aria-labelledby="type-title">
      <h2 id="type-title" className="mb-2 text-lg font-bold">
        글꼴
      </h2>
      <p className="text-base">Pretendard 본문 가나다라 0123456789</p>
      <p className="font-emphasis text-2xl font-bold">Space Grotesk 0123456789</p>
    </section>
    <section aria-labelledby="radius-title">
      <h2 id="radius-title" className="mb-2 text-lg font-bold">
        모서리와 그림자
      </h2>
      <ul className="flex flex-wrap gap-3">
        {RADII.map((radius) => (
          <li key={radius} className={`size-16 bg-muted text-xs ${radius} shadow-card`}>
            {radius}
          </li>
        ))}
      </ul>
    </section>
  </div>
);

const meta = { title: 'Foundations/디자인 토큰', component: DesignTokens } satisfies Meta<
  typeof DesignTokens
>;

export default meta;

export const Tokens: StoryObj<typeof meta> = {};
