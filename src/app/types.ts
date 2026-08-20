export type DayType = "월" | "화" | "수" | "목" | "금";
export type PlanId = "A" | "B" | "C";
export type StepType = "landing" | "setup" | "planner";

/**
 * 복합 요일/시간 슬롯 (예: 월1,2 / 수3 처럼 여러 요일에 걸친 수업)
 */
export interface ScheduleSlot {
  day: DayType;
  startHour: number; // 9~17
  duration: number;  // 시간 단위
  room: string;
}

export interface Course {
  id: string;
  name: string;
  professor: string;
  room: string;       // 단일 강의실 (기존 호환용 / slots 없을 때 사용)
  credits: number;
  day: DayType;       // 단일 요일 (기존 호환용)
  startHour: number;  // 9~17
  duration: number;   // 시간 단위
  colorIndex: number; // 0~5
  failed?: boolean;

  // 크롤러 확장 필드
  courseCode?: string;    // 과목코드 (예: CS3201)
  classNo?: string;       // 분반 (예: 01, 02)
  category?: string;      // 이수구분 (전필/전선/교필/균교 등)
  department?: string;    // 개설학과
  grade?: number;         // 권장 학년
  quota?: number;         // 수강정원
  isOnline?: boolean;     // 비대면/사이버강의 여부
  slots?: ScheduleSlot[]; // 복합 시간 슬롯 (다중 요일 지원 시 사용)
}

export interface GradeInfo {
  university: string;
  college: string;      // 단과대
  department: string;
  completedCredits: string;
  currentGpa: string;
  targetGpa: string;
  remainingSemesters: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Plans {
  A: Course[];
  B: Course[];
  C: Course[];
}

// 과목 색상 팔레트 (미니멀 라이트)
export const COURSE_COLORS = [
  { bg: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-800",  accent: "bg-indigo-400"  },
  { bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-800",  accent: "bg-violet-400"  },
  { bg: "bg-sky-50",     border: "border-sky-200",    text: "text-sky-800",     accent: "bg-sky-400"     },
  { bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-800", accent: "bg-emerald-400" },
  { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-800",   accent: "bg-amber-400"   },
  { bg: "bg-teal-50",    border: "border-teal-200",   text: "text-teal-800",    accent: "bg-teal-400"    },
];

// 샘플 시간표 (플랜 A 기본값)
export const SAMPLE_COURSES: Course[] = [
  { id: "os-mon",  name: "운영체제",    professor: "김민준",    room: "공학관 201",  credits: 3, day: "월", startHour: 9,  duration: 2, colorIndex: 0 },
  { id: "os-wed",  name: "운영체제",    professor: "김민준",    room: "공학관 201",  credits: 3, day: "수", startHour: 9,  duration: 2, colorIndex: 0 },
  { id: "db-tue",  name: "데이터베이스", professor: "이서연",    room: "IT관 302",   credits: 3, day: "화", startHour: 13, duration: 2, colorIndex: 1 },
  { id: "db-thu",  name: "데이터베이스", professor: "이서연",    room: "IT관 302",   credits: 3, day: "목", startHour: 13, duration: 2, colorIndex: 1 },
  { id: "al-tue",  name: "알고리즘",    professor: "박지호",    room: "공학관 105",  credits: 3, day: "화", startHour: 10, duration: 2, colorIndex: 2 },
  { id: "al-thu",  name: "알고리즘",    professor: "박지호",    room: "공학관 105",  credits: 3, day: "목", startHour: 10, duration: 2, colorIndex: 2 },
  { id: "en-wed",  name: "영어회화",    professor: "Park James", room: "언어관 201", credits: 2, day: "수", startHour: 16, duration: 1, colorIndex: 3 },
  { id: "cap-fri", name: "캡스톤디자인", professor: "최현우",    room: "창업관 301",  credits: 3, day: "금", startHour: 13, duration: 3, colorIndex: 4 },
];
