// 교회 기본 정보 수정 요청
// 관리자는 직접 수정할 수 없고, 이 요청을 슈퍼유저에게 전송한다.

export type ChurchInfoField =
  | "name"
  | "pastorName"
  | "email"
  | "phone"
  | "address"
  | "foundedYear";

export interface ChurchChangeRequestItem {
  field: ChurchInfoField;
  currentValue: string;
  requestedValue: string;
}

export type ChangeRequestStatus = "pending" | "approved" | "rejected";

export interface ChurchChangeRequest {
  id: string;
  churchId: string;
  churchName: string; // 요청 시점 스냅샷 — 교회명 변경 시 추적 용이
  requesterUid: string;
  requesterEmail: string;
  requesterName: string;
  items: ChurchChangeRequestItem[];
  reason: string;
  status: ChangeRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;        // 슈퍼유저 이메일
  resolverNote?: string;      // 반려 사유 또는 관리자 메모
  emailNotifiedAt?: string;   // 이메일 통지 여부 및 시각
  readByAdmin?: boolean;      // 관리자가 결과 확인했는지
}

export const CHURCH_INFO_FIELD_LABEL: Record<ChurchInfoField, string> = {
  name: "교회 이름",
  pastorName: "담임목사 성함",
  email: "이메일",
  phone: "연락처",
  address: "주소",
  foundedYear: "설립연도",
};
