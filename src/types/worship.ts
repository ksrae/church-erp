// 반복 가능한 정규 예배 + 일회성 이벤트 타입
// - sunday/wednesday/special: 정규 예배 (반복 가능)
// - event/meeting/revival/seminar: 일회성 이벤트 (포탈 일정으로 노출)
// - other: 기타
export type WorshipType =
  | "sunday"
  | "wednesday"
  | "dawn"
  | "friday"
  | "youth"
  | "student"
  | "children"
  | "sundaySchool"
  | "special"
  | "event"
  | "meeting"
  | "revival"
  | "seminar"
  | "other";

export interface WorshipSchedule {
  id: string;
  churchId?: string;
  name: string;
  type: WorshipType;
  recurrence: {
    kind: "once" | "weekly" | "monthly";
    dayOfWeek?: number;
    weekOfMonth?: number;
    time: string;
  };
  startDate: string;
  endDate?: string;
  exceptions: WorshipException[];
  createdAt: string;
  updatedAt: string;
}

export interface WorshipException {
  date: string;
  kind: "skip" | "override" | "extra";
  overrideData?: Partial<WorshipInstance>;
}

export interface WorshipInstance {
  id: string;
  churchId?: string;
  scheduleId?: string;
  date: string;
  endDate?: string;         // 다일 일정 (일회성 이벤트)
  type: WorshipType;
  time?: string;
  endTime?: string;
  title?: string;
  location?: string;        // 장소 (일회성 이벤트)
  preacher?: string;
  scripture?: string;
  order: WorshipOrderItem[];
  bulletinFileUrl?: string;
  bulletinFileName?: string;
  memo?: string;
  description?: string;     // 일정 설명 (포탈 노출)
  isPublished: boolean;
  detailStatus: "empty" | "partial" | "complete";
  createdAt: string;
  updatedAt: string;
}

export interface WorshipOrderItem {
  id: string;
  seq: number;
  name: string;
  assignee?: string;
  note?: string;
}

export const worshipTypeLabels: Record<WorshipType, string> = {
  sunday: "주일예배",
  wednesday: "수요예배",
  dawn: "새벽예배",
  friday: "금요철야",
  youth: "청년예배",
  student: "학생예배",
  children: "유년예배",
  sundaySchool: "주일학교",
  special: "특별예배",
  event: "행사",
  meeting: "모임",
  revival: "부흥회",
  seminar: "세미나",
  other: "기타",
};

export const worshipTypeColors: Record<WorshipType, string> = {
  sunday: "#1d4ed8",
  wednesday: "#16a34a",
  dawn: "#0369a1",
  friday: "#6d28d9",
  youth: "#ea580c",
  student: "#0d9488",
  children: "#db2777",
  sundaySchool: "#ca8a04",
  special: "#d97706",
  event: "#db2777",
  meeting: "#0891b2",
  revival: "#9333ea",
  seminar: "#059669",
  other: "#7c3aed",
};

// 반복 예배 스케줄에서 선택 가능한 예배 종류
export const WORSHIP_SCHEDULE_TYPES: WorshipType[] = [
  "sunday",
  "wednesday",
  "dawn",
  "friday",
  "youth",
  "student",
  "children",
  "sundaySchool",
  "special",
  "other",
];

// 일회성 이벤트 타입 (예배가 아닌 일정)
export const ONE_TIME_EVENT_TYPES: WorshipType[] = ["event", "meeting", "revival", "seminar"];

export function isOneTimeEvent(type: WorshipType): boolean {
  return ONE_TIME_EVENT_TYPES.includes(type);
}
