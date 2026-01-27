// =============== Admin Types ===============

export type AdminRole = "super" | "finance" | "member";

export interface AdminUser {
  id: string;
  memberId: string;       // 연결된 성도 ID
  memberName: string;     // 성도 이름 (표시용)
  username: string;       // 로그인 아이디
  passwordHash: string;   // 암호화된 비밀번호 (SHA-256 해시)
  role: AdminRole;        // 권한
  createdAt: string;      // 생성일
  lastLogin?: string;     // 마지막 로그인
}

export interface AdminData {
  admins: AdminUser[];
  lastUpdated: string;
}

// 역할 라벨
export const roleLabels: Record<AdminRole, string> = {
  super: "슈퍼 관리자",
  finance: "재정 관리자",
  member: "성도 관리자",
};

// 역할별 접근 가능 경로
export const rolePermissions: Record<AdminRole, string[]> = {
  super: ["*"], // 전체 접근
  finance: ["/", "/finance", "/settings", "/help"], // 재정 + 기본
  member: ["/", "/members", "/settings", "/help"], // 성도관리 + 기본
};
