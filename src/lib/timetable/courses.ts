import defaultCourses from "../../data/courses/default.json";
import sunchonCourses from "../../data/courses/sunchon.json";

export interface CourseTemplate {
  name: string;
  professor: string;
  room: string;
  credits: number;
}

/**
 * 대학교명에 매핑되는 적합한 과목 풀 목록을 동적으로 로딩하여 반환합니다.
 */
export function getAvailableCourses(university?: string): CourseTemplate[] {
  if (university === "국립 순천대학교") {
    return sunchonCourses as CourseTemplate[];
  }
  return defaultCourses as CourseTemplate[];
}

/**
 * 기본 제공되는 가상 과목 풀 (하위 호환성용)
 */
export const AVAILABLE_COURSES = defaultCourses as CourseTemplate[];
