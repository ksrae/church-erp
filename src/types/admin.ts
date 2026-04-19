// =============== Admin Types ===============

export type AdminRole = "super" | "finance" | "member";

// 역할 라벨
export const roleLabels: Record<AdminRole, string> = {
  super: "슈퍼 관리자",
  finance: "재정 관리자",
  member: "성도 관리자",
};

// 역할별 접근 가능 경로
export const rolePermissions: Record<AdminRole, string[]> = {
  super: ["*"],
  finance: ["/", "/finance", "/settings", "/help", "/notifications"],
  member: ["/", "/members", "/settings", "/help", "/notifications", "/worship", "/announcements"],
};
