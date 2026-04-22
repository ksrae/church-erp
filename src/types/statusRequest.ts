// 교회 상태(보류/정지/삭제) 관련 관리자 문의 요청
// - 보류/정지 상태의 교회 관리자가 이메일 대신 인앱 요청서로 슈퍼유저에게 문의한다.
// - 슈퍼유저는 요청을 검토하고 교회 상태를 변경하거나 요청을 종결할 수 있다.

import { ChurchStatus } from "./church";

// 요청 당시 관리자가 처한 맥락
//  - hold / suspended / deleted : 인증된 교회 관리자가 작성
//  - portal_registration        : 포탈 방문자의 교회 등록 문의 (미인증)
//  - portal_general             : 포탈 방문자의 일반 문의 (미인증)
export type StatusRequestContext =
  | "hold"
  | "suspended"
  | "deleted"
  | "portal_registration"
  | "portal_general";

// 슈퍼유저가 요청을 처리하며 수행할 수 있는 액션
//  - activate  : 교회를 active 로 전환 (처리 완료 = 정상화)
//  - hold      : 교회를 hold 로 전환
//  - suspend   : 교회를 suspended 로 전환
//  - delete    : 교회 문서 삭제
//  - none      : 교회 상태 변경 없이 요청만 종결 (반려/정보성 답변)
export type StatusRequestAction = "activate" | "hold" | "suspend" | "delete" | "none";

export type StatusRequestStatus = "pending" | "resolved" | "rejected";

export interface ChurchStatusRequest {
  id: string;
  churchId: string | null;   // 요청 시점 교회 ID — context === "deleted" 인 경우 null 일 수 있음
  churchName: string;        // 요청 시점 스냅샷
  context: StatusRequestContext;
  requesterUid: string;
  requesterEmail: string;
  requesterName: string;
  subject: string;
  message: string;
  status: StatusRequestStatus;
  createdAt: string;

  // 처리 결과
  resolvedAt?: string;
  resolvedBy?: string;             // 슈퍼유저 이메일
  resolvedAction?: StatusRequestAction;
  resolvedChurchStatus?: ChurchStatus; // 액션 적용 후 교회 상태 스냅샷
  resolverNote?: string;           // 처리 사유(간단)
  readByAdmin?: boolean;
}

export const STATUS_REQUEST_CONTEXT_LABEL: Record<StatusRequestContext, string> = {
  hold: "보류 상태 문의",
  suspended: "정지 상태 문의",
  deleted: "교회 삭제 관련 문의",
  portal_registration: "포탈 · 교회 등록 문의",
  portal_general: "포탈 · 일반 문의",
};

export const STATUS_REQUEST_ACTION_LABEL: Record<StatusRequestAction, string> = {
  activate: "처리 완료 (서비스 정상화)",
  hold: "보류로 전환",
  suspend: "정지로 전환",
  delete: "교회 삭제",
  none: "요청 종결 (상태 유지)",
};
