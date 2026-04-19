export type AnnouncementCategory = "notice" | "education" | "event" | "pastoral" | "other";
export type AnnouncementStatus = "draft" | "published" | "expired";

export interface Announcement {
  id: string;
  churchId?: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  startDate: string;
  endDate?: string;
  attachments: { name: string; url: string }[];
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export const categoryLabels: Record<AnnouncementCategory, string> = {
  notice: "공지",
  education: "교육",
  event: "행사",
  pastoral: "목양편지",
  other: "기타",
};

export const categoryColors: Record<AnnouncementCategory, { bg: string; text: string }> = {
  notice: { bg: "#dbeafe", text: "#1d4ed8" },
  education: { bg: "#dcfce7", text: "#16a34a" },
  event: { bg: "#fef3c7", text: "#d97706" },
  pastoral: { bg: "#f3e8ff", text: "#7c3aed" },
  other: { bg: "#f1f5f9", text: "#64748b" },
};
