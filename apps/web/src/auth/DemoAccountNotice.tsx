import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';

type Props = {
  isSubmitting: boolean;
  onLogin: () => void;
};

// 가상 데이터 안내와 테스트 계정 로그인 버튼
export const DemoAccountNotice = ({ isSubmitting, onLogin }: Props) => (
  <Alert variant="info" role="note" aria-label="시연 계정 안내">
    <div className="flex flex-col gap-2">
      <p className="text-sm">
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
  </Alert>
);
