export interface Church {
  id: string;
  name: string;
  licenseKey: string;
  isActive: boolean;
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

export interface ChurchAdmin {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  churchId: string;
  createdAt: string;
  lastLogin?: string;
}
