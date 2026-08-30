import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getAvailableCourses } from "../../../lib/timetable/courses";
import { validateTimetable } from "../../../lib/timetable/conflict";
import { calculateTotalCredits } from "../../../lib/timetable/credits";
import type { Course, DayType } from "../../types";

/**
 * 시간표 과목 목록을 AI 전달용 스키마(schedules 배열 포함)로 포맷팅합니다.
 */
export function formatCoursesForAi(courses: Course[]): any[] {
  const map = new Map<string, any>();

  for (const course of courses) {
    const key = course.name;
    if (!map.has(key)) {
      map.set(key, {
        id: course.id,
        name: course.name,
        professor: course.professor,
        room: course.room,
        credits: course.credits,
        colorIndex: course.colorIndex,
        failed: course.failed,
        isOnline: course.isOnline,
        department: course.department,
        courseCode: course.courseCode,
        schedules: course.isOnline
          ? []
          : [
              {
                day: course.day,
                start: course.startHour,
                end: course.startHour + course.duration,
              },
            ],
      });
    } else {
      const existing = map.get(key);
      if (!course.isOnline) {
        existing.schedules.push({
          day: course.day,
          start: course.startHour,
          end: course.startHour + course.duration,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * AI로부터 반환받은 raw JSON (schedules 배열 포함)을 프론트엔드 Course[] 상태로 변환합니다.
 * Task 3: schedules 배열을 순회하여 모든 요일과 시간대에 맞춰 Course 블록들을 생성합니다.
 */
export function parseAiResponseToCourses(rawTimetable: any[]): Course[] {
  if (!Array.isArray(rawTimetable)) return [];

  const resultCourses: Course[] = [];

  rawTimetable.forEach((item: any, itemIdx: number) => {
    const colorIndex = typeof item.colorIndex === "number" ? item.colorIndex : (itemIdx % 6);
    const failed = Boolean(item.failed);
    const isOnline = Boolean(item.isOnline);
    const baseId = item.id || `course-${item.name || itemIdx}`;

    // 비대면 과목 처리
    if (isOnline) {
      resultCourses.push({
        id: `${baseId}-online`,
        name: item.name || "무제 과목",
        professor: item.professor || "",
        room: item.room || "",
        credits: item.credits || 3,
        day: item.day || "월",
        startHour: item.startHour ?? item.start ?? 9,
        duration: item.duration ?? 1,
        colorIndex,
        failed,
        isOnline: true,
        department: item.department,
        courseCode: item.courseCode,
      });
      return;
    }

    // schedules 배열이 존재하는 경우: schedules 배열을 순회하여 모든 요일/시간대의 Course 블록 생성
    if (Array.isArray(item.schedules) && item.schedules.length > 0) {
      item.schedules.forEach((sched: any, schedIdx: number) => {
        const day: DayType = sched.day || item.day || "월";
        const startHour = sched.start ?? sched.startHour ?? item.startHour ?? 9;
        const endHour = sched.end ?? (sched.startHour && sched.duration ? sched.startHour + sched.duration : startHour + 2);
        const duration = sched.duration ?? (endHour > startHour ? endHour - startHour : 2);

        resultCourses.push({
          id: `${baseId}-${day}-${startHour}-${schedIdx}`,
          name: item.name || "무제 과목",
          professor: item.professor || "",
          room: sched.room || item.room || "",
          credits: item.credits || 3,
          day,
          startHour,
          duration,
          colorIndex,
          failed,
          isOnline: false,
          department: item.department,
          courseCode: item.courseCode,
        });
      });
    } else if (Array.isArray(item.slots) && item.slots.length > 0) {
      // slots 배열이 존재하는 경우
      item.slots.forEach((slot: any, slotIdx: number) => {
        resultCourses.push({
          id: `${baseId}-${slot.day}-${slot.startHour}-${slotIdx}`,
          name: item.name || "무제 과목",
          professor: item.professor || "",
          room: slot.room || item.room || "",
          credits: item.credits || 3,
          day: slot.day,
          startHour: slot.startHour,
          duration: slot.duration,
          colorIndex,
          failed,
          isOnline: false,
          department: item.department,
          courseCode: item.courseCode,
        });
      });
    } else {
      // 단일 day, startHour, duration이 있는 레거시 객체의 경우
      resultCourses.push({
        id: item.id || `${item.name}-${item.day || "월"}-${item.startHour || 9}`,
        name: item.name || "무제 과목",
        professor: item.professor || "",
        room: item.room || "",
        credits: item.credits || 3,
        day: item.day || "월",
        startHour: item.startHour ?? item.start ?? 9,
        duration: item.duration ?? 2,
        colorIndex,
        failed,
        isOnline: false,
        department: item.department,
        courseCode: item.courseCode,
      });
    }
  });

  return resultCourses;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    // ─── 신규 채팅 모드 ───────────────────────────────────────────────────────
    if (body.mode === "chat") {
      const { message, currentTimetable = [], gradeInfo = {} } = body;

      // 1. 사전 시간표 유효성 검사
      const preValidation = validateTimetable(currentTimetable);
      if (!preValidation.success && currentTimetable.length > 0) {
        return NextResponse.json({
          reply: `현재 제공된 시간표 데이터에 사전 문제(시간 겹침 등)가 있어 수정할 수 없습니다: ${preValidation.errors.join(", ")}`,
          updatedTimetable: currentTimetable,
        });
      }

      // API 키 존재 여부 확인 (환경변수 GEMINI_API_KEY)
      const hasApiKey = Boolean(apiKey && apiKey.trim().length > 10);

      if (!hasApiKey) {
        console.log("[SmartEngine] GEMINI_API_KEY 미설정으로 스마트 알고리즘 처리기를 실행합니다.");
        const demoReply = processSmartEngine(message, currentTimetable, gradeInfo);
        return NextResponse.json({
          reply: demoReply.reply,
          updatedTimetable: demoReply.timetable,
          engine: "smart_engine",
        });
      }

      // 실제 API 키가 있는 경우 Google Gemini 호출
      try {
        console.log("[Gemini API] Google Gemini 2.0 API를 직접 호출합니다...");
        const ai = new GoogleGenAI({ apiKey });
        const university = gradeInfo?.university;
        const availableCourses = getAvailableCourses(university);

        const formattedTimetable = formatCoursesForAi(currentTimetable);
        const timetableJson = JSON.stringify(formattedTimetable, null, 2);
        const gradeJson = JSON.stringify(gradeInfo, null, 2);
        const availableCoursesJson = JSON.stringify(availableCourses, null, 2);

        // Task 2: Gemini API 프롬프트 및 JSON 스키마 수정
        const prompt = `당신은 대학교 수강신청 전문 AI 조교입니다. 학생의 현재 시간표를 분석하고 요청사항에 맞게 수정해 주세요.

현재 학점 정보:
${gradeJson}

현재 시간표 (JSON):
${timetableJson}

선택 가능한 강의 목록 (새로운 강의를 추가하거나 대체할 때는 반드시 아래 목록 안에서만 선택하여 name, professor, room, credits를 적용하세요):
${availableCoursesJson}

학생 요청: "${message}"

다음 규칙을 준수하세요:
1. 시간표의 각 과목 객체는 반환 시 다음 필드를 가집니다:
   - name: 과목명 (string)
   - professor: 교수명 (string)
   - room: 강의실 (string)
   - credits: 학점 (number)
   - colorIndex: 0~5 정수
   - failed: boolean (optional)
   - isOnline: boolean (optional)
   - schedules: 시간표 세부 일정 배열 (예: [{ day: "화", start: 9, end: 11 }, { day: "목", start: 10, end: 11 }])
     - day: "월" | "화" | "수" | "목" | "금"
     - start: 시작 시간 (9 ~ 17 정수)
     - end: 종료 시간 (10 ~ 18 정수, start + duration)
2. 일주일에 여러 번 진행되는 다회차 강의인 경우, schedules 배열에 모든 요일과 시간대를 담아 반환하세요.
3. 시간 충돌이 없도록 하세요.
4. 새로운 과목을 임의로 지어내지 마세요. 반드시 제공된 '선택 가능한 강의 목록'에 존재하는 과목명, 교수명, 강의실, 학점을 그대로 사용해야 합니다.
5. id는 과목 식별자(string)입니다. 기존 과목의 id 또는 과목명을 유지하세요.
6. 응답은 다음 JSON 형식으로만 출력하세요 (다른 설명 텍스트 없이 오직 JSON만 출력):

{
  "reply": "친절하고 위트있는 조교 톤의 설명 메시지 (2-3문장, 이모지 포함)",
  "updatedTimetable": [
    {
      "id": "os",
      "name": "운영체제",
      "professor": "김민준",
      "room": "공학관 201",
      "credits": 3,
      "colorIndex": 0,
      "failed": false,
      "isOnline": false,
      "schedules": [
        { "day": "화", "start": 9, "end": 11 },
        { "day": "목", "start": 10, "end": 11 }
      ]
    }
  ]
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: "친절하고 위트있는 조교 톤의 설명 메시지 (2-3문장, 이모지 포함)",
                },
                updatedTimetable: {
                  type: Type.ARRAY,
                  description: "수정된 시간표 과목 목록 배열",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "과목 식별자" },
                      name: { type: Type.STRING, description: "과목명" },
                      professor: { type: Type.STRING, description: "교수명" },
                      room: { type: Type.STRING, description: "강의실" },
                      credits: { type: Type.NUMBER, description: "학점" },
                      colorIndex: { type: Type.INTEGER, description: "색상 인덱스 (0~5)" },
                      failed: { type: Type.BOOLEAN, description: "수강신청 실패(튕김) 여부" },
                      isOnline: { type: Type.BOOLEAN, description: "비대면/사이버 강의 여부" },
                      department: { type: Type.STRING, description: "개설학과" },
                      courseCode: { type: Type.STRING, description: "과목코드" },
                      schedules: {
                        type: Type.ARRAY,
                        description: "다회차 강의 시간표 일정 목록",
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            day: { type: Type.STRING, description: "요일 (월, 화, 수, 목, 금)" },
                            start: { type: Type.INTEGER, description: "시작 시간 (9~17)" },
                            end: { type: Type.INTEGER, description: "종료 시간 (10~18)" },
                          },
                          required: ["day", "start", "end"],
                        },
                      },
                    },
                    required: ["name", "schedules"],
                  },
                },
              },
              required: ["reply", "updatedTimetable"],
            },
          },
        });

        let rawText = response.text ?? "{}";
        rawText = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(rawText);
        const rawUpdated = parsed.updatedTimetable ?? currentTimetable;
        
        // Task 3: AI 응답 JSON 데이터를 Course[] 상태로 변환 및 schedules 순회
        const updatedTimetable: Course[] = parseAiResponseToCourses(rawUpdated);

        const validation = validateTimetable(updatedTimetable);
        if (!validation.success) {
          // 검증 실패 시 스마트 엔진으로 폴백
          const fallback = processSmartEngine(message, currentTimetable, gradeInfo);
          return NextResponse.json({
            reply: fallback.reply,
            updatedTimetable: fallback.timetable,
          });
        }

        console.log("[Gemini API] Google Gemini 2.0 API 응답 성공!");
        return NextResponse.json({
          reply: parsed.reply ?? "요청하신 대로 시간표를 최적화하여 수정했어요! 🎯",
          updatedTimetable: updatedTimetable,
          engine: "gemini_api",
        });
      } catch (error) {
        console.error("[Gemini API Error] API 호출 중 예외 발생 -> 스마트 엔진으로 안전 폴백:", error);
        const fallback = processSmartEngine(message, currentTimetable, gradeInfo);
        return NextResponse.json({
          reply: fallback.reply,
          updatedTimetable: fallback.timetable,
          engine: "smart_engine",
        });
      }
    }

    // ─── 레거시 처방전 모드 ──────────────────────────────────────────────────
    const { currentGpa, targetGpa, failedSubject, remainingCredits, preferredDayOff } = body;
    return NextResponse.json({
      result: `### 🚨 학점 심폐소생 긴급 처방전\n\n**1. 학점 방어 전략**\n- ${failedSubject} 탈락으로 목표 평점(${targetGpa}) 달성을 위해 **최소 ${remainingCredits}학점을 B+ 이상**으로 방어해야 합니다.\n\n**2. 추천 플랜 B 대체 과목 조합**\n- **[플랜 B-1] 교양 꿀강 조합**: '생활 속의 인공지능 (3학점, ${preferredDayOff} 공강 사수 가능)' → 학점 로드가 적고 평가가 유연함\n- **[플랜 B-2] 타과 전공 인정 과목**: '창의적 문제해결기법 (3학점, 비대면/온라인 강의)' → 이동 동선 절약 및 시험 부담 분산\n\n**3. AI 조교의 한마디**\n> "교수님, 이번만 살려주시면 다음 학기엔 장학금으로 보답하겠습니다... 이미 벌어진 일! 플랜 B로 올클보다 값진 역전승 가시죠! 🚀"`,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

// ─── 스마트 시간표 자율 설계 엔진 (자연어 요구사항 완벽 대응) ────────────────
function processSmartEngine(message: string, currentTimetable: Course[], gradeInfo: any) {
  const msg = message.toLowerCase().trim();
  const available = getAvailableCourses(gradeInfo?.university);

  // active(튕기지 않은) 과목 및 현재 학점 계산
  let activeCourses = currentTimetable.filter((c) => !c.failed);

  // ① 18학점 맞추기 요청
  if (msg.includes("18학점") || msg.includes("18 학점") || msg.includes("학점 맞추")) {
    let currentCredits = calculateTotalCredits(activeCourses);
    const updated = [...activeCourses];

    if (currentCredits >= 18) {
      return {
        reply: `현재 이미 ${currentCredits}학점으로 목표인 18학점 이상을 충족하고 계십니다! 🎉 알찬 학기를 응원합니다.`,
        timetable: updated,
      };
    }

    // 18학점이 될 때까지 사용 가능한 과목 추가
    let addedNames: string[] = [];
    for (const cand of available) {
      if (currentCredits >= 18) break;
      if (updated.some((u) => u.name === cand.name)) continue;

      const newCourseSlots = findNonConflictingSlots(cand, updated);
      if (newCourseSlots.length > 0) {
        updated.push(...newCourseSlots);
        addedNames.push(cand.name);
        currentCredits += cand.credits;
      }
    }

    const nextCredits = calculateTotalCredits(updated);
    return {
      reply: `요청하신 대로 18학점에 딱 맞춰 시간표를 구성해 드렸어요! 🎯\n새로 추가된 과목: ${addedNames.join(", ")} (총 ${nextCredits}학점 달성)`,
      timetable: updated,
    };
  }

  // ② 금공강 / 월공강 요청
  if (msg.includes("금공강") || msg.includes("금요일")) {
    const filtered = activeCourses.filter((c) => c.day !== "금");
    return {
      reply: "금요일 공강 완성! 🎉 금요일 수업을 깔끔히 비워 매주 3일 연휴를 확보했습니다.",
      timetable: filtered,
    };
  }
  if (msg.includes("월공강") || msg.includes("월요일")) {
    const filtered = activeCourses.filter((c) => c.day !== "월");
    return {
      reply: "월요일 공강 사수 완료! 🚀 주말의 여운을 월요일까지 이어가세요.",
      timetable: filtered,
    };
  }

  // ③ 1교시 없애기
  if (msg.includes("1교시") || msg.includes("아침")) {
    const filtered = activeCourses.filter((c) => c.startHour !== 9);
    return {
      reply: "1교시(09:00 시작) 수업을 모두 제거했어요 ☀️ 아침잠 사수 성공!",
      timetable: filtered,
    };
  }

  // ④ 팀플 없는 과목 / 꿀교양 채우기
  if (msg.includes("팀플") || msg.includes("꿀교양") || msg.includes("교양")) {
    const updated = [...activeCourses];
    const generalCourses = available.filter((c) => c.category === "균교" || c.category === "교필" || c.isOnline);
    let added: string[] = [];

    for (const cand of generalCourses) {
      if (added.length >= 2) break;
      if (updated.some((u) => u.name === cand.name)) continue;

      const slots = findNonConflictingSlots(cand, updated);
      if (slots.length > 0) {
        updated.push(...slots);
        added.push(cand.name);
      }
    }

    return {
      reply: `로드 부담이 적고 팀플 없는 꿀과목(${added.join(", ")})을 우선 배치해 드렸어요! 🍯`,
      timetable: updated,
    };
  }

  // ⑤ 튕긴 과목 대체 요청
  if (msg.includes("튕긴") || msg.includes("대체") || msg.includes("추가")) {
    const updated = [...activeCourses];
    let replacedName = "";

    for (const cand of available) {
      if (updated.some((u) => u.name === cand.name)) continue;
      const slots = findNonConflictingSlots(cand, updated);
      if (slots.length > 0) {
        updated.push(...slots);
        replacedName = cand.name;
        break;
      }
    }

    return {
      reply: replacedName
        ? `튕긴 과목 대신 [${replacedName}] 과목을 새로 시간표에 쏙 넣어드렸어요! 💡`
        : "현재 시간표에 충돌 없이 들어갈 수 있는 최적 과목을 찾아 배치를 마쳤어요!",
      timetable: updated,
    };
  }

  // ⑥ 기타 모든 요청 시: 과목 1개 추천 배치 후 응답
  const updated = [...activeCourses];
  const cand = available.find((a) => !updated.some((u) => u.name === a.name));
  if (cand) {
    const slots = findNonConflictingSlots(cand, updated);
    if (slots.length > 0) updated.push(...slots);
  }

  return {
    reply: `"${message}" 요청 사항을 분석하여 가장 효율적인 수강 시간표로 조정해 드렸습니다! 🤖✨`,
    timetable: updated,
  };
}

// ─── 시간 충돌하지 않는 슬롯 탐색 함수 (다회차 과목 대응) ──────────────────────────
function findNonConflictingSlots(cand: any, existingCourses: Course[]): Course[] {
  const days: ("월" | "화" | "수" | "목" | "금")[] = ["월", "화", "수", "목", "금"];
  const startHours = [10, 13, 15, 11, 14];

  // 비대면인 경우
  if (cand.isOnline) {
    return [
      {
        id: `${cand.name}-${Date.now()}`,
        name: cand.name,
        professor: cand.professor,
        room: cand.room || "",
        credits: cand.credits,
        day: "월",
        startHour: 9,
        duration: 1,
        colorIndex: (existingCourses.length + 1) % 6,
        isOnline: true,
        department: cand.department,
      },
    ];
  }

  // 대면 과목인 경우 충돌하지 않는 시간 탐색 (3학점 과목인 경우 2회 수업 시도 또는 1회 수업 탐색)
  // 단일 슬롯 후보 탐색
  for (const day of days) {
    for (const startHour of startHours) {
      const testCourse: Course = {
        id: `${cand.name}-${day}-${startHour}`,
        name: cand.name,
        professor: cand.professor,
        room: cand.room || "강의실",
        credits: cand.credits,
        day,
        startHour,
        duration: 2,
        colorIndex: (existingCourses.length + 1) % 6,
        department: cand.department,
      };

      const testList = [...existingCourses, testCourse];
      if (validateTimetable(testList).success) {
        return [testCourse];
      }
    }
  }

  return [];
}
