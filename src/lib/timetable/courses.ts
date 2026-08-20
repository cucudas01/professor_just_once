import defaultCoursesRaw from "../../data/courses/default.json";
import sunchonCoursesRaw from "../../data/courses/sunchon.json";

export interface CourseTemplate {
  name: string;
  professor: string;
  room: string;
  credits: number;
  courseCode?: string;
  classNo?: string;
  category?: string;
  college?: string;
  department?: string;
  grade?: number;
  quota?: number;
  isOnline?: boolean;
}

const defaultCourses = defaultCoursesRaw as CourseTemplate[];
const sunchonCourses = sunchonCoursesRaw as CourseTemplate[];

/**
 * 대학교명에 매핑되는 강좌 풀을 반환합니다.
 */
export function getAvailableCourses(university?: string): CourseTemplate[] {
  if (university === "국립 순천대학교") {
    return sunchonCourses;
  }
  return defaultCourses;
}

/**
 * 특정 대학교의 단과대 목록을 중복 없이 정렬하여 반환합니다.
 */
export function getColleges(university?: string): string[] {
  const courses = getAvailableCourses(university);
  const colleges = courses
    .map((c) => c.college)
    .filter((col): col is string => typeof col === "string" && col.trim().length > 0);
  return Array.from(new Set(colleges)).sort();
}

/**
 * 특정 대학교 + 단과대에 속하는 학과 목록을 반환합니다.
 * college를 생략하면 해당 대학교 전체 학과 목록을 반환합니다.
 */
export function getDepartments(university?: string, college?: string): string[] {
  const courses = getAvailableCourses(university);
  const filtered = college
    ? courses.filter((c) => c.college === college)
    : courses;
  const departments = filtered
    .map((c) => c.department)
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0);
  return Array.from(new Set(departments)).sort();
}

/**
 * 학과/학년/이수구분 기반으로 과목을 필터링합니다.
 */
export function filterCourses(
  university: string | undefined,
  options: { college?: string; department?: string; grade?: number; category?: string }
): CourseTemplate[] {
  const courses = getAvailableCourses(university);
  return courses.filter((c) => {
    if (options.college && c.college !== options.college) return false;
    if (options.department && c.department !== options.department) return false;
    if (options.grade !== undefined && c.grade !== options.grade) return false;
    if (options.category && c.category !== options.category) return false;
    return true;
  });
}

/**
 * 기본 제공 가상 과목 풀 (하위 호환성용)
 */
export const AVAILABLE_COURSES = defaultCourses;
