import type { Meta, StoryObj } from '@storybook/react-vite';
import { Camera, Ellipsis, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Alert } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Chip } from './chip';
import { Combobox, MultiCombobox } from './combobox';
import { DateInput } from './date-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { EmptyState } from './empty-state';
import { FormField } from './form-field';
import { Input, type ControlSize } from './input';
import { Label } from './label';
import { MoneyInput } from './money-input';
import { ProgressBar } from './progress-bar';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Section } from './section';
import { SegmentedControl } from './segmented-control';
import { Select } from './select';
import { StatGroup } from './stat-group';
import { StatusDot } from './status-dot';
import { Switch } from './switch';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Textarea } from './textarea';
import { Tooltip } from './tooltip';

const EMPLOYEES = [
  { value: 'a', label: '정판금', description: '반장 · 판금공', group: '프로젝트 팀' },
  { value: 'b', label: '최설치', description: '기공 · 설치공', group: '프로젝트 팀' },
  { value: 'c', label: '한용접', description: '기공 · 용접공', group: '다른 직원' },
  { value: 'd', label: '김일용', description: '일용', group: '다른 직원' },
  { value: 'e', label: '이조공', description: '조공 · 휴직', group: '다른 직원', disabled: true },
];

const STATUSES = [
  { value: 'PLANNED', label: '예정' },
  { value: 'IN_PROGRESS', label: '진행' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'SUSPENDED', label: '중단' },
];

const SIZES: { size: ControlSize; label: string; use: string }[] = [
  { size: 'sm', label: 'sm', use: '표·필터 줄' },
  { size: 'md', label: 'md', use: '일반 폼 (기본)' },
  { size: 'lg', label: 'lg', use: '현장 입력' },
];

const Row = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="grid gap-3 border-t border-line py-4 first:border-t-0 md:grid-cols-[9rem_1fr] md:items-center">
    <div className="flex flex-col">
      <span className="text-sm font-semibold">{label}</span>
      {hint && <span className="text-xs text-foreground/65">{hint}</span>}
    </div>
    {children}
  </div>
);

// 디자인 시스템 모음: 화면을 만들기 전에 모든 요소의 모양을 한 곳에서 보고 다듬음 (밝게·어둡게는 툴바에서 전환)
const Showcase = () => {
  const [employee, setEmployee] = useState('b');
  const [team, setTeam] = useState<string[]>(['a', 'b']);
  const [status, setStatus] = useState('IN_PROGRESS');
  const [view, setView] = useState('week');
  const [checked, setChecked] = useState(true);
  const [amount, setAmount] = useState<number | null>(185000);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 p-6 md:p-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">컴포넌트 모음</h1>
        <p className="text-sm text-foreground/65">
          입력 요소와 버튼은 같은 크기 단계(sm·md·lg)를 써서 한 줄에 놓으면 높이가 맞습니다
        </p>
      </header>

      <Section title="크기 단계" description="입력·셀렉트·콤보박스·날짜·버튼을 같은 줄에 놓은 모습">
        <div className="flex flex-col">
          {SIZES.map(({ size, label, use }) => (
            <Row key={size} label={label} hint={use}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_10rem_10rem_auto]">
                <Input
                  size={size}
                  aria-label={`${label} 검색`}
                  placeholder="이름으로 찾기"
                  startAdornment={<Search aria-hidden />}
                />
                <Select
                  size={size}
                  aria-label={`${label} 상태`}
                  value={status}
                  onValueChange={setStatus}
                  options={STATUSES}
                />
                <Combobox
                  size={size}
                  aria-label={`${label} 직원`}
                  options={EMPLOYEES}
                  value={employee}
                  onValueChange={setEmployee}
                />
                <DateInput size={size} aria-label={`${label} 날짜`} defaultValue="2026-10-14" />
                <Button size={size}>저장</Button>
              </div>
            </Row>
          ))}
        </div>
      </Section>

      <Section title="입력 칸" divided>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="프로젝트명" hint="현장에서 부르는 이름으로 적어도 됩니다">
            <Input placeholder="예: A동 외장 판금 공사" />
          </FormField>
          <FormField label="연락처" error="형식이 올바르지 않습니다">
            <Input defaultValue="010-12" />
          </FormField>
          <FormField label="금액" hint="천 단위 쉼표가 자동으로 붙습니다">
            <MoneyInput value={amount} onValueChange={setAmount} />
          </FormField>
          <FormField label="일한 시간">
            <Input inputMode="decimal" defaultValue="8" endAdornment="시간" />
          </FormField>
          <FormField label="꺼진 칸">
            <Input disabled defaultValue="수정할 수 없음" />
          </FormField>
          <FormField label="날짜">
            <DateInput defaultValue="2026-10-14" />
          </FormField>
          <FormField label="메모" className="md:col-span-2">
            <Textarea placeholder="관리자만 보는 메모입니다" />
          </FormField>
        </div>
      </Section>

      <Section
        title="선택 칸"
        description="짧은 목록은 Select, 찾아서 골라야 하면 Combobox, 여러 명은 MultiCombobox"
        divided
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="상태">
            <Select value={status} onValueChange={setStatus} options={STATUSES} />
          </FormField>
          <FormField label="공종 (비움 항목)">
            <Select
              value=""
              onValueChange={() => undefined}
              emptyLabel="선택 안 함"
              options={[
                { value: 'sheet', label: '판금' },
                { value: 'interior', label: '인테리어' },
              ]}
            />
          </FormField>
          <FormField label="직원" hint="묶음(프로젝트 팀 / 다른 직원)과 보조 설명">
            <Combobox
              options={EMPLOYEES}
              value={employee}
              onValueChange={setEmployee}
              placeholder="직원 선택"
              onCreate={() => undefined}
              createLabel="직원 새로 등록"
              clearable
            />
          </FormField>
          <FormField label="팀에 추가할 직원" hint="목록을 연 채로 여러 명을 고릅니다">
            <MultiCombobox
              options={EMPLOYEES}
              value={team}
              onValueChange={setTeam}
              placeholder="직원 고르기"
              summary={(count) => `${count}명 선택`}
            />
          </FormField>
        </div>
      </Section>

      <Section title="버튼" divided>
        <div className="flex flex-wrap items-center gap-2">
          <Button>저장</Button>
          <Button variant="secondary">취소</Button>
          <Button variant="soft">추가</Button>
          <Button variant="ghost">더 보기</Button>
          <Button variant="danger">삭제</Button>
          <Button variant="link">전체 보기</Button>
          <Button disabled>꺼짐</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Plus aria-hidden />
            아이콘과 글자
          </Button>
          <Tooltip content="사진 올리기">
            <Button variant="secondary" size="icon" aria-label="사진 올리기">
              <Camera aria-hidden />
            </Button>
          </Tooltip>
          <Button variant="ghost" size="icon-sm" aria-label="수정">
            <Pencil aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="더보기 메뉴">
                <Ellipsis aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>정판금</DropdownMenuLabel>
              <DropdownMenuItem>
                <Pencil aria-hidden />
                기간 수정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger>
                <Trash2 aria-hidden />
                팀에서 빼기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>

      <Section title="체크·라디오·스위치·전환" divided>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-center gap-3 text-[15px]">
              <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
              출근
            </label>
            <RadioGroup defaultValue="ratio">
              <label className="flex min-h-11 items-center gap-3 text-[15px]">
                <RadioGroupItem value="ratio" />
                비율 (하루 = 1.0)
              </label>
              <label className="flex min-h-11 items-center gap-3 text-[15px]">
                <RadioGroupItem value="hours" />
                시간
              </label>
            </RadioGroup>
            <label className="flex min-h-11 items-center justify-between gap-3 text-[15px]">
              메모 알림 받기
              <Switch defaultChecked />
            </label>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>보기 방식</Label>
              <SegmentedControl
                aria-label="보기 방식"
                value={view}
                onValueChange={setView}
                options={[
                  { value: 'day', label: '일' },
                  { value: 'week', label: '주' },
                  { value: 'month', label: '월' },
                ]}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip selected>전체</Chip>
              <Chip>사진</Chip>
              <Chip>문서</Chip>
              <Chip>메모</Chip>
            </div>
          </div>
        </div>
      </Section>

      <Section title="수치·상태" divided>
        <StatGroup
          items={[
            { label: '이번 달 일한 시간', value: '184', unit: '시간' },
            { label: '투입 인원', value: '4', unit: '명' },
            { label: '지출', value: '1,250,000', unit: '원' },
            {
              label: '공수 소진율',
              value: '92',
              unit: '%',
              tone: 'warning',
              hint: '계획의 90% 넘음',
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <StatusDot tone="success">자격 확인됨</StatusDot>
          <StatusDot tone="warning">다른 프로젝트와 기간 겹침</StatusDot>
          <StatusDot tone="danger">안전교육 이수증 없음</StatusDot>
          <StatusDot>계획 없음</StatusDot>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>예정</Badge>
          <Badge tone="primary">진행</Badge>
          <Badge tone="success">완료</Badge>
          <Badge tone="warning">임시 저장</Badge>
          <Badge tone="danger">만료</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ProgressBar aria-label="진행률" value={64} />
          <ProgressBar aria-label="소진율" value={92} tone="warning" />
        </div>
      </Section>

      <Section title="알림 상자" description="저장 실패 같은 오류와 꼭 읽어야 할 안내에만" divided>
        <Alert variant="info">자동으로 저장됩니다. 마무리하면 저장을 눌러 주세요.</Alert>
        <Alert variant="warning">종료일이 지난 프로젝트입니다.</Alert>
        <Alert>저장하지 못했습니다. 다시 시도해 주세요.</Alert>
      </Section>

      <Section title="탭·표·빈 화면" divided>
        <Tabs defaultValue="a">
          <TabsList aria-label="예시">
            <TabsTrigger value="a">작업 기록</TabsTrigger>
            <TabsTrigger value="b">인원</TabsTrigger>
            <TabsTrigger value="c">비용·자재</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>이름</TableHeaderCell>
                  <TableHeaderCell>직종</TableHeaderCell>
                  <TableHeaderCell className="text-right">시간</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">정판금</TableCell>
                  <TableCell>판금공</TableCell>
                  <TableCell className="text-right tabular-nums">8시간</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">최설치</TableCell>
                  <TableCell>설치공</TableCell>
                  <TableCell className="text-right tabular-nums">4시간</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
        <EmptyState
          title="아직 기록한 날이 없습니다"
          description="달력에서 날짜를 눌러 첫 기록을 남겨 보세요"
        />
      </Section>
    </div>
  );
};

const meta = {
  title: 'Foundations/컴포넌트 모음',
  component: Showcase,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Showcase>;

export default meta;

export const AllComponents: StoryObj<typeof meta> = {};
