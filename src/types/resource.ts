export type ResourceCategory = "bulletin" | "sermon" | "education" | "music" | "other";
export type ResourceVisibility = "private" | "public";

export interface Resource {
  id: string;
  churchId: string;
  title: string;
  description?: string;
  category: ResourceCategory;
  visibility: ResourceVisibility;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  uploadedAt: string;
  uploadedBy?: string;
  uploaderName?: string;
}

export const RESOURCE_MAX_BYTES = 5 * 1024 * 1024;

export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  bulletin: "주보",
  sermon: "설교",
  education: "교육",
  music: "찬양/악보",
  other: "기타",
};

export const resourceCategoryColors: Record<ResourceCategory, { bg: string; text: string }> = {
  bulletin: { bg: "#dbeafe", text: "#1d4ed8" },
  sermon: { bg: "#f3e8ff", text: "#7c3aed" },
  education: { bg: "#dcfce7", text: "#16a34a" },
  music: { bg: "#fef3c7", text: "#d97706" },
  other: { bg: "#f1f5f9", text: "#64748b" },
};

export const resourceVisibilityLabels: Record<ResourceVisibility, string> = {
  private: "비공개",
  public: "공개",
};
