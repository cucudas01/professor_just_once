export interface CourseTemplate {
  name: string;
  professor: string;
  room: string;
  credits: number;
}

/**
 * AI가 새로운 과목을 임의로 생성(환각)하지 않고, 선택해서 사용할 수 있도록 정의한 가상의 강의 풀(Pool)입니다.
 */
export const AVAILABLE_COURSES: CourseTemplate[] = [
  { name: "자료구조", professor: "정재선", room: "IT관 405", credits: 3 },
  { name: "컴퓨터네트워크", professor: "이민우", room: "공학관 303", credits: 3 },
  { name: "웹프로그래밍", professor: "박소윤", room: "창업관 202", credits: 3 },
  { name: "선형대수학", professor: "강현석", room: "기초관 102", credits: 3 },
  { name: "확률과통계", professor: "윤지현", room: "기초관 204", credits: 3 },
  { name: "인공지능개론", professor: "오동현", room: "IT관 512", credits: 3 },
  { name: "컴퓨터그래픽스", professor: "최은영", room: "공학관 207", credits: 3 },
  { name: "생활속의심리학", professor: "김태호", room: "인문관 101", credits: 2 },
  { name: "서양미술의이해", professor: "이지선", room: "예술관 205", credits: 2 },
  { name: "영화로보는역사", professor: "홍길동", room: "인문관 304", credits: 2 },
  { name: "기초글쓰기", professor: "박찬우", room: "인문관 202", credits: 2 },
  { name: "실용영어", professor: "Sarah Connor", room: "언어관 301", credits: 2 },
  { name: "미시경제학", professor: "조현민", room: "상경관 203", credits: 3 },
  { name: "회계원리", professor: "김상철", room: "상경관 105", credits: 3 },
  { name: "디자인사고", professor: "정유진", room: "예술관 102", credits: 2 },
];
