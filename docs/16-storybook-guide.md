# Storybook 가이드 (화면 조각, 화면 동작 시험)

스토리는 **보여 주는 문서이자 시험**이다. 화면(컴포넌트, 페이지)을 상태별로 띄우고, `play`로 클릭, 입력한 결과를 검사한다.

## 1. 실행

```bash
pnpm storybook                 # 열기: http://localhost:6006 (왼쪽에서 스토리 선택, 아래 Interactions 탭에서 단계 확인)
pnpm test:stories              # 모든 스토리의 play를 자동 실행 (빌드 포함, 처음 한 번 chromium 설치 필요)
pnpm --filter @field-note/web exec playwright install chromium   # 처음 한 번
```

- 툴바에서 밝게/어둡게, 모바일/데스크톱 화면 크기를 바꿀 수 있다
- 접근성(a11y) 위반은 경고가 아니라 **실패**로 처리된다. Accessibility 탭에서 원인을 본다
- 서버는 필요 없다. API 호출은 목업 서버(msw)가 대신 답한다

## 2. 스토리 파일 만들기 (복사해서 고치기)

컴포넌트 옆에 `이름.stories.tsx`를 둔다.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StaffingMonthCalendar } from './StaffingMonthCalendar';

const meta = {
  title: 'Dashboard/이번 달 인력 달력', // 폴더/이름, 화면 목록에 이렇게 나온다
  component: StaffingMonthCalendar,
  args: { today: '2026-10-15', weeks: [] }, // 모든 스토리의 기본 입력
} satisfies Meta<typeof StaffingMonthCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

// 상태 하나 = 스토리 하나
export const Default: Story = {};

// 같은 날 겹침이 있는 상태
export const ConflictDay: Story = {
  args: { weeks: weeksWithConflict },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /겹침 1명/ }));
    await expect(canvas.getByText('그날 하루 기록 보기')).toBeInTheDocument();
  },
};
```

규칙:

- 스토리 이름은 **상태를 설명하는 영어 파스칼 케이스**(`ConflictDay`), 위에 한국어 주석으로 무엇을 보여 주는지 한 줄
- 한 스토리는 한 가지 상태, 한 가지 흐름만 시험한다
- 새 화면, 컴포넌트에는 스토리를 꼭 만든다 (정상, 비어 있음, 오류, 로딩 중 중 해당하는 것)

## 3. 주소, 로그인이 필요한 페이지 스토리

페이지는 미리 만들어진 라우터 안에서 뜬다. 주소는 `parameters.router`로, 로그인은 `loaders`로 정한다.

```tsx
const meta = {
  title: 'Pages/직원 카드',
  component: EmployeeCardPage,
  parameters: {
    router: { initialEntries: ['/employees/ID?tab=credentials'], path: '/employees/:id' },
  },
  loaders: [() => signIn('hanbit')], // 목업 서버에 로그인한 상태로 시작
} satisfies Meta<typeof EmployeeCardPage>;
```

- 목업 데이터는 `src/mocks/` (`demoSource.ts`가 시드와 같은 인물, 프로젝트)
- 스토리마다 목업 상태가 초기화된다 (`.storybook/preview.tsx`의 loaders). 별도 초기화가 필요한 목업은 거기에 `resetMock…()`을 더한다
- `MemoryRouter`는 이미 감싸져 있다. 스토리에서 `<MemoryRouter>`를 또 감싸면 "Router inside Router" 오류가 난다

## 4. play 작성 요령

```tsx
import { chooseOption } from '../lib/storyActions';

play: async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText('문서 이름'), '시공도');
  await chooseOption(canvas.getByLabelText('분류'), '도면'); // 선택 목록은 이 도우미로
  await userEvent.upload(canvas.getByLabelText('문서 파일'), new File(['%PDF-1.7'], 'a.pdf'));
  await canvas.findByText(/올려 두었습니다/); // 비동기 결과는 findBy…로 기다림
  await userEvent.click(canvas.getByRole('button', { name: '저장' }));

  await waitFor(() => expect(args.onSubmit).toHaveBeenCalled()); // 콜백 호출은 waitFor로
};
```

- 찾기: `getByRole` > `getByLabelText` > `getByText` 순서. 안 보이게 되는 것을 확인할 때는 `queryBy…`
- 비동기는 `findBy…`, `waitFor`로 기다린다. 고정 시간 `setTimeout`으로 기다리지 않는다
- 콜백 확인용은 `args: { onSubmit: fn(async () => undefined) }` (`import { fn } from 'storybook/test'`)
- 창(Modal), 확인 창(alertdialog)은 `canvasElement` 밖(`document.body`)에 뜬다: `within(document.body).findByRole('alertdialog')`
- 창이 열려 있으면 뒤 화면은 접근성 트리에서 빠져 `getByRole`로 안 잡힌다. 창을 닫은 뒤에 확인한다
- 서버 응답을 스토리에서만 바꾸고 싶으면 스토리 `parameters.msw.handlers`에 핸들러를 넘긴다

## 5. 자주 나는 문제

| 증상                                                   | 원인, 해결                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `You cannot render a <Router> inside another <Router>` | 스토리에서 라우터를 또 감쌈. 지우고 `parameters.router`만 쓴다                                                                                       |
| `useBlocker must be used within a data router`         | 스토리의 라우터는 데이터 라우터가 아님. `LeaveGuard`처럼 라우터가 없으면 건너뛰는 컴포넌트를 쓴다                                                    |
| `Unable to find an accessible element with the role…`  | 창이 열려 뒤 화면이 가려짐, 또는 아직 로딩 중. `findBy…`로 기다리거나 창을 닫는다                                                                    |
| 접근성(a11y) 실패                                      | Accessibility 탭의 규칙 이름대로 라벨, 대비, 역할을 고친다                                                                                           |
| 앞 스토리의 입력이 남아 있음                           | 기기 초안(IndexedDB)은 매 스토리 초기화되지만, 스토리 안에서 만든 상태는 구분자를 스토리마다 새로 만든다 (예: `useState(() => crypto.randomUUID())`) |
| `test:stories`가 브라우저를 못 찾음                    | `playwright install chromium` 실행                                                                                                                   |

## 6. 이 도구로 무엇을 확인하나

- 컴포넌트 상태별 모양(밝은/어두운 화면, 모바일/데스크톱)
- 입력→검증 문구→저장 호출 같은 **한 화면 안의 동작**
- 접근성

여러 화면에 걸친 흐름이나 실제 서버가 필요한 확인은 Playwright(`docs/15-playwright-guide.md`)로 한다.
