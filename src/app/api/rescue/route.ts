import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { AVAILABLE_COURSES } from "../../../lib/timetable/courses";
import { validateTimetable } from "../../../lib/timetable/conflict";
import type { Course } from "../../types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    // ─── 신규 채팅 모드 ───────────────────────────────────────────────────────
    if (body.mode === "chat") {
      const { message, currentTimetable = [], gradeInfo = {} } = body;

      // 1. 현재 들어온 시간표의 사전 유효성 확인
      const preValidation = validateTimetable(currentTimetable);
      if (!preValidation.success && currentTimetable.length > 0) {
        return NextResponse.json({
          reply: `현재 제공된 시간표 데이터에 문제가 있어 수정할 수 없습니다: ${preValidation.errors.join(", ")}`,
          updatedTimetable: currentTimetable,
        });
      }

      // API 키 없을 때 데모 응답
      if (!apiKey) {
        const demoReply = getDemoReply(message, currentTimetable);
        const demoValidation = validateTimetable(demoReply.timetable);
        if (!demoValidation.success) {
          return NextResponse.json({
            reply: `[데모 모드] 변경하려는 시간표에 비즈니스 규칙 위반이 발생했습니다: ${demoValidation.errors[0]}. 원래 시간표를 유지합니다.`,
            updatedTimetable: currentTimetable,
          });
        }
        return NextResponse.json({
          reply: demoReply.reply,
          updatedTimetable: demoReply.timetable,
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const timetableJson = JSON.stringify(currentTimetable, null, 2);
      const gradeJson = JSON.stringify(gradeInfo, null, 2);
      const availableCoursesJson = JSON.stringify(AVAILABLE_COURSES, null, 2);

      const prompt = `당신은 대학교 수강신청 전문 AI 조교입니다. 학생의 현재 시간표를 분석하고 요청사항에 맞게 수정해 주세요.

현재 학점 정보:
${gradeJson}

현재 시간표 (JSON):
${timetableJson}

선택 가능한 강의 목록 (새로운 강의를 추가하거나 대체할 때는 반드시 아래 목록 안에서만 선택하여 name, professor, room, credits를 적용하세요):
${availableCoursesJson}

학생 요청: "${message}"

다음 규칙을 준수하세요:
1. 시간표의 각 Course 객체는 다음 필드를 가집니다: id(string), name(string), professor(string), room(string), credits(number), day("월"|"화"|"수"|"목"|"금"), startHour(9~17 정수), duration(1~5 정수), colorIndex(0~5 정수), failed(boolean optional)
2. 같은 과목이 여러 요일에 있을 수 있습니다 (e.g., 월수 각각 별도 Course 객체)
3. 시간 충돌이 없도록 하세요.
4. 새로운 과목을 임의로 지어내지 마세요. 반드시 제공된 '선택 가능한 강의 목록'에 존재하는 과목명, 교수명, 강의실, 학점을 그대로 사용해야 합니다.
5. id는 "새과목이름-요일" 형식으로 고유하게 생성하세요. 기존 과목은 id를 그대로 유지해야 합니다.
6. 응답은 다음 JSON 형식으로만 출력하세요 (다른 설명 텍스트 없이 오직 JSON만 출력):

{
  "reply": "친절하고 위트있는 조교 톤의 설명 메시지 (2-3문장, 이모지 포함)",
  "updatedTimetable": [/* Course 객체 배열 전체 */]
}`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text ?? "{}";
        const parsed = JSON.parse(rawText);

        const updatedTimetable: Course[] = parsed.updatedTimetable ?? currentTimetable;

        // 시간표 비즈니스 규칙 및 스키마 검증
        const validation = validateTimetable(updatedTimetable);
        if (!validation.success) {
          console.error("AI Generated Timetable Validation Failed:", validation.errors);
          return NextResponse.json({
            reply: `AI가 제안한 시간표 검증에 실패했습니다. 겹치는 시간이 있거나 잘못된 형식입니다. 변경하지 않고 유지합니다. (오류: ${validation.errors[0]})`,
            updatedTimetable: currentTimetable,
          });
        }

        return NextResponse.json({
          reply: parsed.reply ?? "시간표를 수정했어요!",
          updatedTimetable: updatedTimetable,
        });
      } catch (error) {
        console.error("AI Response Parsing or Execution Error:", error);
        return NextResponse.json({
          reply: "AI 응답을 처리하지 못했습니다. 현재 시간표는 변경되지 않았습니다. 다시 시도해 주세요.",
          updatedTimetable: currentTimetable,
        });
      }
    }

    // ─── 레거시 모드 (기존 호환) ──────────────────────────────────────────────
    const { currentGpa, targetGpa, failedSubject, remainingCredits, preferredDayOff } = body;

    const prompt = `당신은 대학생들의 꼬여버린 학점과 수강신청을 살려내는 '학점 심폐소생 AI'입니다.
상황:
- 현재 평점: ${currentGpa} / 4.5
- 목표 평점: ${targetGpa} / 4.5
- 이번 학기 신청 실패(튕긴) 과목: ${failedSubject}
- 필요한 대체 학점: ${remainingCredits}학점
- 선호 공강 요일: ${preferredDayOff}

위 상황을 바탕으로:
1. 목표 학점 달성을 위해 이번 학기에 채워야 할 학점 및 성적 방어 전략 1줄 요약
2. 실패한 과목을 대체할 수 있는 현실적인 플랜 B 과목 조합 2가지 제안 (과목명 가상 예시, 학점, 난이도/성적받기 수월도, 요일/시간)
3. 학생을 위로하고 격려하는 유머러스한 한 마디 ("교수님 이번만요" 톤앤매너)

위 내용을 친절하고 깔끔한 마크다운 형식으로 작성해 주세요.`;

    if (!apiKey) {
      return NextResponse.json({
        result: `### 🚨 학점 심폐소생 긴급 처방전\n\n**1. 학점 방어 전략**\n- ${failedSubject} 탈락으로 목표 평점(${targetGpa}) 달성을 위해 **최소 ${remainingCredits}학점을 B+ 이상**으로 방어해야 합니다.\n\n**2. 추천 플랜 B 대체 과목 조합**\n- **[플랜 B-1] 교양 꿀강 조합**: '생활 속의 인공지능 (3학점, ${preferredDayOff} 공강 사수 가능)' → 학점 로드가 적고 평가가 유연함\n- **[플랜 B-2] 타과 전공 인정 과목**: '창의적 문제해결기법 (3학점, 비대면/온라인 강의)' → 이동 동선 절약 및 시험 부담 분산\n\n**3. AI 조교의 한마디**\n> "교수님, 이번만 살려주시면 다음 학기엔 장학금으로 보답하겠습니다... 이미 벌어진 일! 플랜 B로 올클보다 값진 역전승 가시죠! 🚀"`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ result: response.text });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

// ─── 데모 응답 생성기 (API 키 없을 때) ────────────────────────────────────────
function getDemoReply(message: string, currentTimetable: Course[]) {
  const msg = message.toLowerCase();

  if (msg.includes("금공강") || msg.includes("금요일")) {
    const filtered = currentTimetable.filter((c) => c.day !== "금");
    return {
      reply:
        "금요일 공강 완성! 🎉 금요일 과목들을 모두 제거했어요. 이제 매주 3일 연휴네요... 부럽습니다. (데모 모드 - GEMINI_API_KEY를 설정하면 실제 AI가 최적 대체 과목을 추천해 드려요!)",
      timetable: filtered,
    };
  }

  if (msg.includes("1교시") || msg.includes("아침")) {
    const filtered = currentTimetable.filter((c) => c.startHour !== 9);
    return {
      reply: "1교시 제거 완료! ☀️ 9시 수업을 모두 없앴어요. 이제 아침잠을 마음껏 즐기세요. (데모 모드)",
      timetable: filtered,
    };
  }

  if (msg.includes("튕긴") || msg.includes("대체")) {
    return {
      reply:
        "튕긴 과목을 확인했어요! 🚨 현재 시간표에서 튕김 처리된 과목들을 AI가 분석해 대체 과목을 추천해 드리려면 GEMINI_API_KEY가 필요해요. 지금은 데모 모드입니다.",
      timetable: currentTimetable,
    };
  }

  return {
    reply: `"${message}" 요청을 받았어요! 🤖 실제 AI 응답을 받으려면 .env.local에 GEMINI_API_KEY를 설정해 주세요. 현재는 데모 모드로 동작 중입니다.`,
    timetable: currentTimetable,
  };
}
