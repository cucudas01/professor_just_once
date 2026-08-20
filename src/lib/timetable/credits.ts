import type { Course } from "../../app/types";

/**
 * 과목의 ID에서 요일 접미사(예: -월, -화, -mon, -wed)를 제거하여 기본 과목 ID를 가져옵니다.
 */
export function getBaseCourseId(id: string): string {
  return id
    .replace(/-[월화수목금]$/i, "") // 한글 요일 접미사 제거 (예: -월)
    .replace(/-[a-z]{3}$/i, "");   // 영어 요일 접미사 제거 (예: -mon)
}

/**
 * 시간표의 총 학점을 계산합니다.
 * 동일한 과목이 다른 요일에 배치되어 있더라도 학점이 중복으로 가산되지 않도록 합니다.
 */
export function calculateTotalCredits(courses: Course[]): number {
  const activeCourses = courses.filter((c) => !c.failed);
  const seenKeys = new Set<string>();
  let total = 0;

  for (const course of activeCourses) {
    const baseId = getBaseCourseId(course.id);
    // 기본 ID와 과목명을 결합하여 고유 키 식별
    const uniqueKey = `${baseId}::${course.name}`;

    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      total += course.credits;
    }
  }

  return total;
}
