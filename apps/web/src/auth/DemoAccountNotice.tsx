import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';

type Props = {
  loginId: string;
  password: string;
  onFill: () => void;
};

// 시연 환경 안내: 공개 계정과 가상 데이터임을 알리고 입력 칸을 한 번에 채움
export const DemoAccountNotice = ({ loginId, password, onFill }: Props) => (
  <Alert variant="info" role="note" aria-label="시연 계정 안내">
    <div className="flex flex-col gap-2">
      <p className="font-semibold">시연용 체험 환경입니다</p>
      <p className="text-sm">
        화면에 나오는 회사·직원·프로젝트는 모두 가상의 데이터이며, 매일 새벽에 처음 상태로
        초기화됩니다. 실제 정보는 입력하지 말아 주세요
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-foreground/70">아이디</dt>
        <dd className="font-mono">{loginId}</dd>
        <dt className="text-foreground/70">비밀번호</dt>
        <dd className="font-mono break-all">{password}</dd>
      </dl>
      <Button type="button" variant="soft" size="sm" className="self-start" onClick={onFill}>
        이 계정으로 채우기
      </Button>
    </div>
  </Alert>
);
