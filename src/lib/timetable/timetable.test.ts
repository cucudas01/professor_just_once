import { describe, it, expect } from "vitest";
import type { Course } from "../../app/types";
import { calculateTotalCredits } from "./credits";
import { hasTimeConflict, findConflictingCourses, validateTimetable } from "./conflict";
import { safeParseTimetable } from "./validation";
import { getAvailableCourses, getDepartments } from "./courses";

describe("수강 신청 학점 계산 테스트", () => {
  it("과목 1개일 때 정상적으로 합산한다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
      },
    ];
    expect(calculateTotalCredits(courses)).toBe(3);
  });

  it("동일 과목이 여러 시간으로 쪼개져 있어도 학점은 중복되지 않는다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
      },
      {
        id: "os-wed",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "수",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
      },
    ];
    expect(calculateTotalCredits(courses)).toBe(3);
  });

  it("서로 다른 과목은 각각 정상적으로 학점을 합산한다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
      },
      {
        id: "db-tue",
        name: "데이터베이스",
        professor: "이서연",
        room: "IT관 302",
        credits: 3,
        day: "화",
        startHour: 13,
        duration: 2,
        colorIndex: 1,
      },
    ];
    expect(calculateTotalCredits(courses)).toBe(6);
  });

  it("빈 시간표일 때는 0학점이다", () => {
    expect(calculateTotalCredits([])).toBe(0);
  });

  it("튕긴(failed) 과목은 학점 합산에서 제외한다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
        failed: true,
      },
      {
        id: "db-tue",
        name: "데이터베이스",
        professor: "이서연",
        room: "IT관 302",
        credits: 3,
        day: "화",
        startHour: 13,
        duration: 2,
        colorIndex: 1,
      },
    ];
    expect(calculateTotalCredits(courses)).toBe(3);
  });
});

describe("시간 충돌 감지 테스트", () => {
  it("동일 요일에 시간이 겹치는 경우 충돌을 감지한다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 10,
        duration: 2,
        colorIndex: 0,
      },
      {
        id: "db-mon",
        name: "데이터베이스",
        professor: "이서연",
        room: "IT관 302",
        credits: 3,
        day: "월",
        startHour: 11,
        duration: 2,
        colorIndex: 1,
      },
    ];
    expect(hasTimeConflict(courses)).toBe(true);
    expect(findConflictingCourses(courses).length).toBe(1);
  });

  it("동일 요일이라도 시간이 겹치지 않는 경우는 통과한다 (연속된 시간 포함)", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 10,
        duration: 2,
        colorIndex: 0,
      },
      {
        id: "db-mon",
        name: "데이터베이스",
        professor: "이서연",
        room: "IT관 302",
        credits: 3,
        day: "월",
        startHour: 12,
        duration: 2,
        colorIndex: 1,
      },
    ];
    expect(hasTimeConflict(courses)).toBe(false);
  });

  it("시간이 겹쳐도 요일이 다르면 충돌이 발생하지 않는다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 10,
        duration: 2,
        colorIndex: 0,
      },
      {
        id: "db-tue",
        name: "데이터베이스",
        professor: "이서연",
        room: "IT관 302",
        credits: 3,
        day: "화",
        startHour: 10,
        duration: 2,
        colorIndex: 1,
      },
    ];
    expect(hasTimeConflict(courses)).toBe(false);
  });

  it("겹치는 시간이 있더라도 튕긴(failed) 과목은 충돌 계산에서 제외한다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 10,
        duration: 2,
        colorIndex: 0,
        failed: true,
      },
      {
        id: "db-mon",
        name: "데이터베이스",
        professor: "이서연",
        room: "IT관 302",
        credits: 3,
        day: "월",
        startHour: 11,
        duration: 2,
        colorIndex: 1,
      },
    ];
    expect(hasTimeConflict(courses)).toBe(false);
  });
});

describe("시간표 비즈니스 룰 및 스키마 검증 테스트", () => {
  it("정상적인 시간표 데이터는 검증을 통과한다", () => {
    const courses: Course[] = [
      {
        id: "os-mon",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
      },
    ];
    const validation = validateTimetable(courses);
    expect(validation.success).toBe(true);
  });

  it("운영 시간(09:00 ~ 18:00)을 초과하는 수업(예: 17시 시작 2시간 수업)은 거부한다", () => {
    const courses: Course[] = [
      {
        id: "night-class",
        name: "야간특강",
        professor: "최교수",
        room: "창업관 101",
        credits: 2,
        day: "화",
        startHour: 17,
        duration: 2,
        colorIndex: 0,
      },
    ];
    const validation = validateTimetable(courses);
    expect(validation.success).toBe(false);
    expect(validation.errors[0]).toContain("초과합니다");
  });

  it("중복된 ID를 가진 과목이 포함되면 검증을 거부한다", () => {
    const courses: Course[] = [
      {
        id: "dup-id",
        name: "자료구조",
        professor: "이교수",
        room: "IT관 101",
        credits: 3,
        day: "월",
        startHour: 10,
        duration: 2,
        colorIndex: 0,
      },
      {
        id: "dup-id",
        name: "네트워크",
        professor: "박교수",
        room: "IT관 102",
        credits: 3,
        day: "수",
        startHour: 14,
        duration: 2,
        colorIndex: 1,
      },
    ];
    const validation = validateTimetable(courses);
    expect(validation.success).toBe(false);
    expect(validation.errors[0]).toContain("중복된 ID 감지");
  });

  it("Zod Schema 규격을 위반한 데이터(잘못된 요일, 범위 초과 등)는 파싱 시 거절된다", () => {
    const badData = [
      {
        id: "bad-day",
        name: "교양",
        professor: "정교수",
        room: "인문관 101",
        credits: 3,
        day: "토" as any,
        startHour: 10,
        duration: 2,
        colorIndex: 0,
      },
    ];
    const parsed = safeParseTimetable(badData);
    expect(parsed.success).toBe(false);
  });
});

describe("대학별 강의 데이터 동적 로더 테스트", () => {
  it("대학교명이 '국립 순천대학교'인 경우 순천대학교 강의 데이터를 반환한다", () => {
    const courses = getAvailableCourses("국립 순천대학교");
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.some((c) => c.name === "글로컬시대 남도문화")).toBe(true);
  });

  it("대학교명이 지정되지 않거나 기타인 경우 기본 가상 강의 데이터를 반환한다", () => {
    const courses = getAvailableCourses();
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.some((c) => c.name === "자료구조")).toBe(true);
  });
});

describe("복합 슬롯(slots[]) 시간 충돌 감지 테스트", () => {
  it("slots[]를 가진 과목들이 서로 충돌하는 경우 감지한다", () => {
    const courses: Course[] = [
      {
        id: "a",
        name: "과목A",
        professor: "교수A",
        room: "101",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
        slots: [{ day: "월", startHour: 9, duration: 2, room: "101" }],
      },
      {
        id: "b",
        name: "과목B",
        professor: "교수B",
        room: "102",
        credits: 3,
        day: "월",
        startHour: 10,
        duration: 2,
        colorIndex: 1,
        slots: [{ day: "월", startHour: 10, duration: 2, room: "102" }],
      },
    ];
    expect(hasTimeConflict(courses)).toBe(true);
  });

  it("slots[]를 가진 과목이지만 요일이 다르면 충돌하지 않는다", () => {
    const courses: Course[] = [
      {
        id: "a",
        name: "과목A",
        professor: "교수A",
        room: "101",
        credits: 3,
        day: "월",
        startHour: 9,
        duration: 2,
        colorIndex: 0,
        slots: [
          { day: "월", startHour: 9, duration: 2, room: "101" },
          { day: "수", startHour: 9, duration: 2, room: "101" },
        ],
      },
      {
        id: "b",
        name: "과목B",
        professor: "교수B",
        room: "102",
        credits: 3,
        day: "화",
        startHour: 9,
        duration: 2,
        colorIndex: 1,
        slots: [
          { day: "화", startHour: 9, duration: 2, room: "102" },
          { day: "목", startHour: 9, duration: 2, room: "102" },
        ],
      },
    ];
    expect(hasTimeConflict(courses)).toBe(false);
  });
});

describe("getDepartments 학과 목록 동적 추출 테스트", () => {
  it("순천대학교 데이터에서 학과 목록이 정상적으로 추출된다", () => {
    const depts = getDepartments("국립 순천대학교");
    expect(Array.isArray(depts)).toBe(true);
    expect(depts.length).toBeGreaterThan(0);
    expect(depts).toContain("컴퓨터공학전공");
  });

  it("비어있는 학과명은 결과에서 제외된다", () => {
    const depts = getDepartments("국립 순천대학교");
    expect(depts.every((d: string) => d.trim().length > 0)).toBe(true);
  });
});
