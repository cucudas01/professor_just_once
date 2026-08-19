import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
    try {
        const { currentGpa, targetGpa, failedSubject, remainingCredits, preferredDayOff } = await req.json();

        const prompt = `
당신은 대학생들의 꼬여버린 학점과 수강신청을 살려내는 '학점 심폐소생 AI'입니다.
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

위 내용을 친절하고 깔끔한 마크다운 형식으로 작성해 주세요.
`;

        const apiKey = process.env.GEMINI_API_KEY;

        // API Key가 없어도 작동하도록 기본 예시 데이터 제공
        if (!apiKey) {
            return NextResponse.json({
                result: `### 🚨 학점 심폐소생 긴급 처방전\n\n**1. 학점 방어 전략**\n- ${failedSubject} 탈락으로 목표 평점(${targetGpa}) 달성을 위해 **최소 ${remainingCredits}학점을 B+ 이상**으로 방어해야 합니다.\n\n**2. 추천 플랜 B 대체 과목 조합**\n- **[플랜 B-1] 교양 꿀강 조합**: '생활 속의 인공지능 (3학점, ${preferredDayOff} 공강 사수 가능)' → 학점 로드가 적고 평가가 유연함\n- **[플랜 B-2] 타과 전공 인정 과목**: '창의적 문제해결기법 (3학점, 비대면/온라인 강의)' → 이동 동선 절약 및 시험 부담 분산\n\n**3. AI 조교의 한마디**\n> "교수님, 이번만 살려주시면 다음 학기엔 장학금으로 보답하겠습니다... 이미 벌어진 일! 플랜 B로 올클보다 값진 역전승 가시죠! 🚀"`
            });
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return NextResponse.json({ result: response.text });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: 'Gemini 처리 중 에러가 발생했습니다.' }, { status: 500 });
    }
}