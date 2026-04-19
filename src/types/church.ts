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
  logo?: string;
  website?: string;
  description?: string;
  pastorMemberId?: string;
  memberAdminMemberId?: string;
  financeAdminMemberId?: string;
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

export interface PortalPost {
  id: string;
  title: string;
  content: string;
  type: "notice" | "news" | "event" | "sermon";
  imageUrl?: string;
  linkUrl?: string;
  churchId?: string;
  churchName?: string;
  isPublished: boolean;
  isPinned: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const portalPostTypeLabels: Record<PortalPost["type"], string> = {
  notice: "공지",
  news: "뉴스",
  event: "행사",
  sermon: "말씀",
};

export const portalPostTypeColors: Record<PortalPost["type"], { bg: string; text: string }> = {
  notice: { bg: "#dbeafe", text: "#1d4ed8" },
  news: { bg: "#dcfce7", text: "#16a34a" },
  event: { bg: "#fef3c7", text: "#d97706" },
  sermon: { bg: "#f3e8ff", text: "#7c3aed" },
};

export interface PortalHero {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  ctaLabel?: string;
  order: number;
  isActive: boolean;
  overlayColor?: string;
  createdAt: string;
  updatedAt: string;
}
