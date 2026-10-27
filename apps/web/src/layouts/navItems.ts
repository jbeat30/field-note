import {
  BookUser,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  House,
  NotebookPen,
  Settings,
  Users,
} from 'lucide-react';

export type NavItem = { to: string; label: string; end?: boolean; icon: typeof House };

const HOME: NavItem = { to: '/', label: '대시보드', end: true, icon: House };
const PROJECTS: NavItem = { to: '/projects', label: '프로젝트', icon: FolderKanban };
const EMPLOYEES: NavItem = { to: '/employees', label: '직원', icon: Users };
const PARTNERS: NavItem = { to: '/partners', label: '명부', icon: BookUser };
const MONTHLY: NavItem = { to: '/monthly-hours', label: '월 공수표', icon: CalendarDays };
const STAFFING: NavItem = { to: '/staffing', label: '인력 배치', icon: CalendarRange };
const INBOX: NavItem = { to: '/inbox', label: '메모함', icon: NotebookPen };
const SETTINGS: NavItem = { to: '/settings', label: '설정', icon: Settings };

// 왼쪽 메뉴(넓은 화면): 프로젝트 중심 업무와 회사 관리용 구분, 작업 내역은 프로젝트 안에서 처리, 설정은 내 메뉴(프로필)에서 진입
export const SIDEBAR_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: '프로젝트 관리', items: [HOME, PROJECTS] },
  { title: '관리', items: [EMPLOYEES, STAFFING, MONTHLY, PARTNERS, INBOX] },
];

// 아래 메뉴(좁은 화면): 자주 쓰는 네 가지 + 더보기
export const TAB_ITEMS: NavItem[] = [HOME, PROJECTS, EMPLOYEES, PARTNERS];
export const MORE_ITEMS: NavItem[] = [STAFFING, MONTHLY, INBOX, SETTINGS];
