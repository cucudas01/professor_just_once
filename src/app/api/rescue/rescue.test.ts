import { describe, it, expect } from "vitest";
import { POST, parseAiResponseToCourses, formatCoursesForAi } from "./route";
import type { Course } from "../../types";

describe("Rescue API Route (/api/rescue)", () => {
  it("chat 모드에서 금공강 요청 시 금요일 과목을 제거한다", async () => {
    const mockRequest = new Request("http://localhost:3000/api/rescue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        message: "금공강 만들어줘",
        currentTimetable: [
          { id: "1", name: "과목A", professor: "교수A", room: "101", credits: 3, day: "금", startHour: 9, duration: 2, colorIndex: 0 },
          { id: "2", name: "과목B", professor: "교수B", room: "102", credits: 3, day: "월", startHour: 10, duration: 2, colorIndex: 1 }
        ],
        gradeInfo: { university: "국립 순천대학교" }
      })
    });

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain("금요일 공강");
    expect(data.updatedTimetable.some((c: any) => c.day === "금")).toBe(false);
  });

  it("chat 모드에서 '학점 18학점 맞춰줘' 요청 시 18학점이 되도록 강좌를 자동 채워준다", async () => {
    const mockRequest = new Request("http://localhost:3000/api/rescue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        message: "학점 18학점 맞춰줘",
        currentTimetable: [
          { id: "1", name: "과목A", professor: "교수A", room: "101", credits: 3, day: "월", startHour: 9, duration: 2, colorIndex: 0 },
          { id: "2", name: "과목B", professor: "교수B", room: "102", credits: 3, day: "화", startHour: 10, duration: 2, colorIndex: 1 }
        ],
        gradeInfo: { university: "국립 순천대학교" }
      })
    });

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain("18학점");
    expect(data.updatedTimetable.length).toBeGreaterThan(2);
  });

  it("parseAiResponseToCourses는 schedules 배열을 순회하여 모든 요일 과목 블록을 생성한다", () => {
    const rawAiResponse = [
      {
        id: "os",
        name: "운영체제",
        professor: "김민준",
        room: "공학관 201",
        credits: 3,
        colorIndex: 0,
        schedules: [
          { day: "화", start: 9, end: 11 },
          { day: "목", start: 10, end: 12 }
        ]
      }
    ];

    const courses = parseAiResponseToCourses(rawAiResponse);
    expect(courses.length).toBe(2);

    const tueCourse = courses.find(c => c.day === "화");
    expect(tueCourse).toBeDefined();
    expect(tueCourse?.startHour).toBe(9);
    expect(tueCourse?.duration).toBe(2);

    const thuCourse = courses.find(c => c.day === "목");
    expect(thuCourse).toBeDefined();
    expect(thuCourse?.startHour).toBe(10);
    expect(thuCourse?.duration).toBe(2);
  });

  it("formatCoursesForAi는 다회차 동일 과목을 schedules 배열로 병합한다", () => {
    const courses: Course[] = [
      { id: "os-tue", name: "운영체제", professor: "김민준", room: "공학관 201", credits: 3, day: "화", startHour: 9, duration: 2, colorIndex: 0 },
      { id: "os-thu", name: "운영체제", professor: "김민준", room: "공학관 201", credits: 3, day: "목", startHour: 10, duration: 2, colorIndex: 0 }
    ];

    const formatted = formatCoursesForAi(courses);
    expect(formatted.length).toBe(1);
    expect(formatted[0].name).toBe("운영체제");
    expect(formatted[0].schedules.length).toBe(2);
    expect(formatted[0].schedules[0]).toEqual({ day: "화", start: 9, end: 11 });
    expect(formatted[0].schedules[1]).toEqual({ day: "목", start: 10, end: 12 });
  });

  it("parseAiResponseToCourses는 잘못되었거나 비어있는 구조 데이터에 대해서도 예외 없이 안전한 배열을 반환한다", () => {
    expect(parseAiResponseToCourses(null as any)).toEqual([]);
    expect(parseAiResponseToCourses(undefined as any)).toEqual([]);
    expect(parseAiResponseToCourses("invalid string" as any)).toEqual([]);
    expect(parseAiResponseToCourses([])).toEqual([]);
  });
});
