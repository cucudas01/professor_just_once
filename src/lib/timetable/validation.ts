import { z } from "zod";
import type { Course } from "../../app/types";

export const DayTypeSchema = z.enum(["월", "화", "수", "목", "금"]);

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "과목명은 필수입니다."),
  professor: z.string().min(1, "교수명은 필수입니다."),
  room: z.string().min(1, "강의실은 필수입니다."),
  credits: z.number().min(1, "학점은 최소 1학점 이상이어야 합니다.").max(6, "학점은 최대 6학점 이하이어야 합니다."),
  day: DayTypeSchema,
  startHour: z.number().int().min(9, "시작 시간은 9시 이후여야 합니다.").max(17, "시작 시간은 17시 이전이어야 합니다."),
  duration: z.number().int().min(1, "수업 시간은 최소 1시간 이상이어야 합니다.").max(5, "수업 시간은 최대 5시간 이하이어야 합니다."),
  colorIndex: z.number().int().min(0).max(5),
  failed: z.boolean().optional(),
});

export const TimetableSchema = z.array(CourseSchema);

export function safeParseCourse(data: unknown): { success: true; data: Course } | { success: false; error: string } {
  const result = CourseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Course };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
  };
}

export function safeParseTimetable(data: unknown): { success: true; data: Course[] } | { success: false; error: string } {
  const result = TimetableSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Course[] };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
  };
}
