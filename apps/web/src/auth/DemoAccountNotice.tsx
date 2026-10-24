import { Button } from '../components/ui/button';

type Props = {
  isSubmitting: boolean;
  onLogin: () => void;
};

// 가상 데이터 안내와 체험 계정 로그인 버튼: 잉크 면 위에 주황 버튼
export const DemoAccountNotice = ({ isSubmitting, onLogin }: Props) => (
  <div
    role="note"
    aria-label="시연 계정 안내"
    className="flex items-center justify-between gap-3 rounded-[18px] bg-[#14110d] py-3.5 pr-3.5 pl-[18px] text-[#fbf7ee]"
  >
    <div className="flex min-w-0 flex-col gap-0.5">
      <b className="text-[15px] font-bold">체험해 보기</b>
      <span className="text-[13px] text-[#ddd]">가상 데이터 · 매일 새벽 초기화</span>
    </div>
    <Button
      type="button"
      variant="accent"
      className="h-11 rounded-xl px-[18px] text-[15px] font-extrabold"
      disabled={isSubmitting}
      onClick={onLogin}
    >
      체험하기
    </Button>
  </div>
);
