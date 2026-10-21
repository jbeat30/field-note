import { useConfirm } from '../components/ui/confirm-dialog';

import type { StagedFiles } from './useStagedFiles';

// 작성을 그만둘 때 임시 파일이 지워진다는 확인 문구 (화면 이동·창 닫기 모두 같은 문구)
export const LEAVE_CONFIRM = {
  title: '작성을 그만둘까요?',
  description: '올려 둔 파일이 삭제됩니다. 새로고침이나 브라우저 닫기로는 지워지지 않습니다',
  confirmLabel: '그만두고 파일 삭제',
  cancelLabel: '계속 작성',
  danger: true,
} as const;

/**
 * @description 폼 닫기 전 확인: 임시 파일이 있으면 확인을 받고 지운 뒤 닫음, 없으면 바로 닫음
 * @param staged 폼의 임시 파일 목록
 * @param close 실제로 폼을 닫는 함수
 * @returns 닫기 요청 함수와 확인 창 (화면에 함께 그려야 함)
 */
export const useLeaveConfirm = (staged: StagedFiles, close: () => void) => {
  const { confirm, dialog } = useConfirm();

  const requestClose = async () => {
    if (staged.files.length > 0) {
      if (!(await confirm(LEAVE_CONFIRM))) return;

      await staged.discardAll();
    }

    close();
  };

  return { requestClose, dialog };
};
