import type { Meta, StoryObj } from '@storybook/react-vite';
import { Camera, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardTitle } from './card';
import { Checkbox } from './checkbox';
import { Chip } from './chip';
import { Combobox } from './combobox';
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
import { Input } from './input';
import { Label } from './label';
import { ProgressBar } from './progress-bar';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { SegmentedControl } from './segmented-control';
import { Select } from './select';
import { Switch } from './switch';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Textarea } from './textarea';
import { Tooltip } from './tooltip';

const EMPLOYEES = [
  { value: 'a', label: '정판금', description: '반장 · 판금공' },
  { value: 'b', label: '최설치', description: '기공 · 설치공' },
  { value: 'c', label: '한용접', description: '기공 · 용접공' },
  { value: 'd', label: '김일용', description: '일용' },
  { value: 'e', label: '이조공', description: '조공 · 휴직', disabled: true },
];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-xl bg-surface-subtle p-5">
    <h2 className="text-base font-bold">{title}</h2>
    {children}
  </section>
);

// 디자인 시스템 모음: 화면을 만들기 전에 모든 요소의 모양을 한 곳에서 보고 다듬는다 (밝게·어둡게는 툴바에서 전환)
const Showcase = () => {
  const [employee, setEmployee] = useState('b');
  const [view, setView] = useState('week');
  const [checked, setChecked] = useState(true);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="버튼">
        <div className="flex flex-wrap items-center gap-2">
          <Button>저장</Button>
          <Button variant="secondary">취소</Button>
          <Button variant="soft">추가</Button>
          <Button variant="ghost">더 보기</Button>
          <Button variant="danger">삭제</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">작은 버튼</Button>
          <Button>보통</Button>
          <Button size="lg">큰 버튼</Button>
          <Button disabled>꺼짐</Button>
          <Button>
            <Plus aria-hidden className="size-5" />
            아이콘과 글자
          </Button>
          <Tooltip content="사진 올리기">
            <Button variant="secondary" size="icon" aria-label="사진 올리기">
              <Camera aria-hidden className="size-5" />
            </Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="입력 칸">
        <FormField label="프로젝트명" hint="현장에서 부르는 이름으로 적어도 됩니다">
          <Input placeholder="예: A동 외장 판금 공사" />
        </FormField>
        <FormField label="연락처" error="형식이 올바르지 않습니다">
          <Input defaultValue="010-12" />
        </FormField>
        <FormField label="꺼진 칸">
          <Input disabled defaultValue="수정할 수 없음" />
        </FormField>
        <FormField label="메모">
          <Textarea placeholder="관리자만 보는 메모입니다" />
        </FormField>
      </Section>

      <Section title="선택 칸">
        <FormField label="상태 (기본 선택)">
          <Select defaultValue="IN_PROGRESS">
            <option value="PLANNED">예정</option>
            <option value="IN_PROGRESS">진행</option>
            <option value="COMPLETED">완료</option>
          </Select>
        </FormField>
        <FormField label="직원 (검색해서 고르기)" hint="이름이나 직책을 쓰면 걸러집니다">
          <Combobox
            options={EMPLOYEES}
            value={employee}
            onValueChange={setEmployee}
            placeholder="직원 선택"
            clearable
          />
        </FormField>
        <FormField label="날짜">
          <DateInput defaultValue="2026-10-13" />
        </FormField>
      </Section>

      <Section title="체크·라디오·스위치">
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
        <label className="flex items-center justify-between gap-3 text-[15px]">
          메모 알림 받기
          <Switch defaultChecked />
        </label>
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
      </Section>

      <Section title="칩·배지·진행률">
        <div className="flex flex-wrap gap-2">
          <Chip selected>진행 중</Chip>
          <Chip>예정</Chip>
          <Chip>완료</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>진행 전</Badge>
          <Badge tone="primary">진행 중</Badge>
          <Badge tone="success">완료</Badge>
          <Badge tone="warning">임박</Badge>
          <Badge tone="danger">초과</Badge>
        </div>
        <ProgressBar aria-label="진행률" value={64} />
        <ProgressBar aria-label="소진율" value={92} tone="warning" />
      </Section>

      <Section title="알림 상자">
        <Alert variant="info">자동으로 저장됩니다. 마무리하면 저장을 눌러 주세요.</Alert>
        <Alert variant="success">저장했습니다.</Alert>
        <Alert variant="warning">종료일이 지난 프로젝트입니다.</Alert>
        <Alert>저장하지 못했습니다. 다시 시도해 주세요.</Alert>
      </Section>

      <Section title="탭·메뉴">
        <Tabs defaultValue="a">
          <TabsList aria-label="예시">
            <TabsTrigger value="a">작업</TabsTrigger>
            <TabsTrigger value="b">현황</TabsTrigger>
            <TabsTrigger value="c">사진</TabsTrigger>
          </TabsList>
          <TabsContent value="a">작업 내용이 여기에 나옵니다</TabsContent>
        </Tabs>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                <Ellipsis aria-hidden className="size-5" />
                더보기 메뉴
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>정판금</DropdownMenuLabel>
              <DropdownMenuItem>
                <Pencil aria-hidden />
                이름 바꾸기
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger>
                <Trash2 aria-hidden />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>

      <Section title="카드·표·빈 화면">
        <Card className="flex flex-col gap-1 bg-surface-nested">
          <CardTitle>A동 외장 판금 공사</CardTitle>
          <p className="text-sm text-foreground/70">진행 40% · 소진 6%</p>
        </Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>이름</TableHeaderCell>
              <TableHeaderCell>시간</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>정판금</TableCell>
              <TableCell>8시간</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>최설치</TableCell>
              <TableCell>4시간</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <EmptyState title="아직 작업 내역이 없습니다" description="오늘 작업을 입력해 보세요" />
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
