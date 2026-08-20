"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import type { ChatMessage, Course, GradeInfo, PlanId } from "../types";
import { calculateTotalCredits } from "../../lib/timetable/credits";

const QUICK_CHIPS = [
  "금공강 사수해줘",
  "1교시 없애줘",
  "팀플 없는 과목으로 채워줘",
  "꿀교양 위주로 짜줘",
  "튕긴 과목 대체해줘",
  "학점 18학점 맞춰줘",
];

interface Props {
  courses: Course[];
  gradeInfo: GradeInfo;
  activePlan: PlanId;
  onCoursesChange: (courses: Course[]) => void;
}

export default function ChatSidebar({ courses, gradeInfo, activePlan, onCoursesChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `안녕하세요! 저는 시간표 AI 조교입니다 😊\n현재 시간표를 분석했어요. 아래 조건들을 말씀해 주시면 최적의 시간표로 수정해 드릴게요!\n\n예시: "금요일 공강 만들어줘", "팀플 없는 교양으로 채워줘"`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const activePlanRef = useRef(activePlan);

  useEffect(() => {
    activePlanRef.current = activePlan;
  }, [activePlan]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const initialPlan = activePlan;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const prevCredits = calculateTotalCredits(courses);

    try {
      const res = await fetch("/api/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          message: text,
          currentTimetable: courses,
          gradeInfo,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `요청을 처리하는 도중 오류가 발생했습니다: ${data.error ?? "알 수 없는 오류"}\n현재 시간표는 변경되지 않았습니다.`,
          },
        ]);
        return;
      }

      // 시간표 업데이트 및 변경 전/후 학점 확인
      let replyMessage = data.reply ?? "처리가 완료됐어요!";

      if (data.updatedTimetable && Array.isArray(data.updatedTimetable)) {
        const nextCredits = calculateTotalCredits(data.updatedTimetable);

        // 실제로 시간표 과목 구성이 변경되었는지 검사
        const isChanged = JSON.stringify(courses) !== JSON.stringify(data.updatedTimetable);

        if (isChanged) {
          if (activePlanRef.current === initialPlan) {
            onCoursesChange(data.updatedTimetable);
            replyMessage += `\n\n📊 **수강 설계 리포트 (플랜 ${initialPlan})**\n- 학점 변동: ${prevCredits}학점 ➔ ${nextCredits}학점`;
          } else {
            replyMessage += `\n\n⚠️ 응답 처리 중 탭(플랜 ${initialPlan} ➔ 플랜 ${activePlanRef.current})이 변경되어 현재 시간표 상태는 유지되었습니다.`;
          }
        } else {
          // 변경이 안 되었는데 에러성 메시지가 없을 때 명시
          if (!replyMessage.includes("실패") && !replyMessage.includes("유지")) {
            replyMessage += `\n\n⚠️ 시간표의 시간 충돌이나 학점 중복 검증 등으로 인해 기존 시간표 상태가 유지되었습니다.`;
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: replyMessage },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "네트워크 오류가 발생했습니다. 현재 시간표는 변경되지 않았으니 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* 사이드바 헤더 */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Bot className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">AI 시간표 조교</p>
          <p className="text-xs text-slate-400">Gemini 3.6 Flash</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 animate-fade-in ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {/* 아바타 */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-indigo-100"
                  : "bg-slate-100"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>

            {/* 버블 */}
            <div
              className={`max-w-[80%] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "chat-bubble-user"
                  : "chat-bubble-assistant"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="chat-bubble-assistant px-3 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span className="text-sm text-slate-400">분석 중...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 빠른 선택 칩 */}
      <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-400 mb-2">빠른 선택</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 입력창 */}
      <form
        onSubmit={handleSubmit}
        className="px-3 pb-3 pt-2 border-t border-slate-100 flex gap-2 flex-shrink-0"
      >
        <input
          type="text"
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="요청사항을 입력하세요..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 disabled:opacity-50 transition-all"
        />
        <button
          id="chat-send-btn"
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl transition-colors flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
