import { describe, it, expect } from "vitest";
import { POST } from "./route";

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
});
