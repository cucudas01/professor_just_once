import type { Course } from "../../app/types";
import { safeParseTimetable } from "./validation";

/**
 * 튕기지 않은(!failed) 과목들 간의 시간 충돌 여부를 확인합니다.
 */
export function hasTimeConflict(courses: Course[]): boolean {
  const activeCourses = courses.filter((c) => !c.failed);
  for (let i = 0; i < activeCourses.length; i++) {
    for (let j = i + 1; j < activeCourses.length; j++) {
      const c1 = activeCourses[i];
      const c2 = activeCourses[j];

      if (c1.day === c2.day) {
        // 시간 겹침 체크: c1.startHour < c2.endHour && c2.startHour < c1.endHour
        const c1End = c1.startHour + c1.duration;
        const c2End = c2.startHour + c2.duration;
        if (c1.startHour < c2End && c2.startHour < c1End) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * 충돌이 일어나는 과목들의 쌍을 모두 찾아 반환합니다.
 */
export function findConflictingCourses(courses: Course[]): [Course, Course][] {
  const activeCourses = courses.filter((c) => !c.failed);
  const conflicts: [Course, Course][] = [];
  for (let i = 0; i < activeCourses.length; i++) {
    for (let j = i + 1; j < activeCourses.length; j++) {
      const c1 = activeCourses[i];
      const c2 = activeCourses[j];

      if (c1.day === c2.day) {
        const c1End = c1.startHour + c1.duration;
        const c2End = c2.startHour + c2.duration;
        if (c1.startHour < c2End && c2.startHour < c1End) {
          conflicts.push([c1, c2]);
        }
      }
    }
  }
  return conflicts;
}

/**
 * 시간표의 모든 규칙(비즈니스 룰 및 데이터 포맷)을 종합 검증합니다.
 */
export function validateTimetable(courses: Course[]): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. 스키마 및 데이터 형식 검증
  const parsed = safeParseTimetable(courses);
  if (!parsed.success) {
    errors.push(`데이터 형식 오류: ${parsed.error}`);
    return { success: false, errors };
  }

  // 2. 개별 과목의 시간 한계선 검증 (startHour + duration <= 18)
  for (const course of courses) {
    if (course.startHour + course.duration > 18) {
      errors.push(
        `[${course.name}] 수업 시간이 운영 시간(09:00 ~ 18:00)을 초과합니다 (${course.startHour}시 시작, ${course.duration}시간 수업).`
      );
    }
  }

  // 3. 시간 충돌 검사
  const conflicts = findConflictingCourses(courses);
  if (conflicts.length > 0) {
    for (const [c1, c2] of conflicts) {
      errors.push(
        `시간 충돌 감지: [${c1.name}](${c1.day}요일 ${c1.startHour}시)와 [${c2.name}](${c2.day}요일 ${c2.startHour}시)의 시간이 겹칩니다.`
      );
    }
  }

  // 4. 동일 ID 고유성 검사 (failed 여부 상관없이 중복 ID 불가)
  const ids = new Set<string>();
  for (const course of courses) {
    if (ids.has(course.id)) {
      errors.push(`중복된 ID 감지: [${course.name}]의 ID(${course.id})가 고유하지 않습니다.`);
    }
    ids.add(course.id);
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
