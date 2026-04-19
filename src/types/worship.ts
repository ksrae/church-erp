export interface WorshipSchedule {
  id: string;
  churchId?: string;
  name: string;
  type: "sunday" | "wednesday" | "special" | "other";
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
  type: "sunday" | "wednesday" | "special" | "other";
  time?: string;
  title?: string;
  preacher?: string;
  scripture?: string;
  order: WorshipOrderItem[];
  bulletinFileUrl?: string;
  bulletinFileName?: string;
  memo?: string;
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

export const worshipTypeLabels: Record<WorshipInstance["type"], string> = {
  sunday: "주일예배",
  wednesday: "수요예배",
  special: "특별예배",
  other: "기타",
};

export const worshipTypeColors: Record<WorshipInstance["type"], string> = {
  sunday: "#1d4ed8",
  wednesday: "#16a34a",
  special: "#d97706",
  other: "#7c3aed",
};
