// 교회 서비스 상태
//   active    : 정상 서비스
//   hold      : 보류 — 성도 열람은 가능하지만 관리자 작업 불가 (복구 가능)
//   suspended : 정지 — 서비스 완전 중지, 성도 포탈에서 제거, 관리자 접속 차단 (복구 불가)
export type ChurchStatus = "active" | "hold" | "suspended";

export interface Church {
  id: string;
  name: string;
  licenseKey: string;
  isActive: boolean;
  status?: ChurchStatus;         // 기본값(undefined) = "active"
  statusReason?: string;          // 보류/정지 사유 (관리자용 표시)
  statusChangedAt?: string;       // 상태 변경 시각 (ISO)
  createdAt: string;
  licenseAdminUid?: string;
  licenseAdminEmail?: string;
  pastorName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  pastorMemberId?: string;
  memberAdminMemberId?: string;
  financeAdminMemberId?: string;

  // 포탈에 노출되는 교회 브랜딩 ------------------------------------------------
  logo?: string;              // 교회 로고 (Firebase Storage URL)
  photos?: string[];          // 교회 소개 사진 (Firebase Storage URL 배열) - 자동 슬라이드
  tagline?: string;           // 포탈 hero에 노출되는 한 줄 소개

  // 포탈 노출 여부 토글 ------------------------------------------------------
  showAnnouncements?: boolean;  // 공지사항 포탈 공개
  showSchedule?: boolean;       // 캘린더 포탈 공개
}

export function getChurchStatus(church: Pick<Church, "status" | "isActive">): ChurchStatus {
  if (church.status) return church.status;
  // 레거시: isActive === false 인 문서는 "hold" 로 해석
  if (church.isActive === false) return "hold";
  return "active";
}

export interface ChurchAdmin {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  churchId: string;
  createdAt: string;
  lastLogin?: string;
}
