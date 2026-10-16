import { expect, userEvent, waitFor, within } from 'storybook/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 선택 칸의 접근성 이름 (라벨 또는 aria-label)
const nameOf = (element: HTMLElement) =>
  element.getAttribute('aria-label') ??
  (element as HTMLButtonElement).labels?.[0]?.textContent ??
  '';

/**
 * @description 스토리 시험용: 선택 칸(Select·Combobox)을 열고 이름으로 항목 선택, 목록은 화면 맨 위(portal)에 열려 문서 전체에서 탐색
 * 데이터를 받는 중 화면이 다시 그려져 칸이 바뀌거나 목록이 닫히면 같은 이름의 칸을 다시 찾아 열기
 * @param trigger 선택 칸 (getByLabelText 등으로 찾은 요소)
 * @param name 항목 이름 (보조 설명이 붙어 있어도 앞부분만 맞으면 됨) 또는 몇 번째 항목(0부터)
 */
export const chooseOption = async (trigger: HTMLElement, name: string | number) => {
  const body = within(trigger.ownerDocument.body);
  const label = nameOf(trigger);
  const current = () =>
    trigger.isConnected || !label ? trigger : body.getByLabelText(label, { selector: 'button' });
  const find = () =>
    typeof name === 'number'
      ? body.getAllByRole('option')[name]
      : body.queryByRole('option', { name: new RegExp(`^${escape(name)}`) });

  await waitFor(
    async () => {
      const element = current();

      if (element.getAttribute('aria-expanded') !== 'true') await userEvent.click(element);
      await expect(find()).toBeTruthy();
    },
    { timeout: 5000, interval: 250 },
  );
  await userEvent.click(find()!);
};
