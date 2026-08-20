import type { Course, ScheduleSlot } from "../../app/types";
import { safeParseTimetable } from "./validation";

/**
 * 과목의 유효한 시간 슬롯 목록을 반환합니다.
 * slots[] 가 있으면 slots를 사용, 없으면 기존 day/startHour/duration/room 기반으로 단일 슬롯 생성
 */
function getSlots(course: Course): ScheduleSlot[] {
  if (course.slots && course.slots.length > 0) {
    return course.slots;
  }
  return [{ day: course.day, startHour: course.startHour, duration: course.duration, room: course.room }];
}

/**
 * 두 슬롯 사이의 시간 겹침 여부를 판별합니다.
 */
function slotsOverlap(a: ScheduleSlot, b: ScheduleSlot): boolean {
  if (a.day !== b.day) return false;
  return a.startHour < b.startHour + b.duration && b.startHour < a.startHour + a.duration;
}

/**
 * 튕기지 않은(!failed) 과목들 간의 시간 충돌 여부를 확인합니다.
 * slots[] 복합 요일 슬롯을 완벽하게 지원합니다.
 */
export function hasTimeConflict(courses: Course[]): boolean {
  const activeCourses = courses.filter((c) => !c.failed);
  for (let i = 0; i < activeCourses.length; i++) {
    for (let j = i + 1; j < activeCourses.length; j++) {
      const aSlots = getSlots(activeCourses[i]);
      const bSlots = getSlots(activeCourses[j]);
      for (const a of aSlots) {
        for (const b of bSlots) {
          if (slotsOverlap(a, b)) return true;
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
      const aSlots = getSlots(activeCourses[i]);
      const bSlots = getSlots(activeCourses[j]);
      let conflicted = false;
      for (const a of aSlots) {
        for (const b of bSlots) {
          if (slotsOverlap(a, b)) { conflicted = true; break; }
        }
        if (conflicted) break;
      }
      if (conflicted) conflicts.push([activeCourses[i], activeCourses[j]]);
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
    const slots = getSlots(course);
    for (const slot of slots) {
      if (slot.startHour + slot.duration > 18) {
        errors.push(
          `[${course.name}] 수업 시간이 운영 시간(09:00 ~ 18:00)을 초과합니다 (${slot.startHour}시 시작, ${slot.duration}시간 수업).`
        );
      }
    }
  }

  // 3. 시간 충돌 검사
  const conflicts = findConflictingCourses(courses);
  for (const [c1, c2] of conflicts) {
    errors.push(
      `시간 충돌 감지: [${c1.name}]와 [${c2.name}]의 시간이 겹칩니다.`
    );
  }

  // 4. 동일 ID 고유성 검사
  const ids = new Set<string>();
  for (const course of courses) {
    if (ids.has(course.id)) {
      errors.push(`중복된 ID 감지: [${course.name}]의 ID(${course.id})가 고유하지 않습니다.`);
    }
    ids.add(course.id);
  }

  return { success: errors.length === 0, errors };
}
