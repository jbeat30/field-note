import { Button } from '../components/ui/button';

type Props = {
  isSubmitting: boolean;
  onLogin: () => void;
};

// 가상 데이터 안내와 테스트 계정 로그인 버튼: 잉크 면 위에 라임 버튼
export const DemoAccountNotice = ({ isSubmitting, onLogin }: Props) => (
  <div
    role="note"
    aria-label="시연 계정 안내"
    className="flex flex-col gap-3 rounded-lg bg-[#14110d] px-5 py-4 text-[#fbf7ee]"
  >
    <p className="text-sm leading-relaxed font-medium">
      화면에 나오는 회사·직원·프로젝트는 모두 가상의 데이터이며, 매일 새벽에 처음 상태로
      초기화됩니다.
    </p>
    <Button
      type="button"
      variant="soft"
      size="sm"
      className="self-start"
      disabled={isSubmitting}
      onClick={onLogin}
    >
      테스트 계정 이용하기
    </Button>
  </div>
);
