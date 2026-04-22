/**
 * Church Portal - Admin Security
 * 슈퍼유저: config/superUser.email 에 저장된 이메일과 일치
 * 교회관리자: churchAdmins/{uid} 에 저장
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { ChurchAdmin, Church, getChurchStatus } from "../types/church";
import { listSuperDelegates } from "./superAdmins";

// 교회 삭제/정지 감지 시 관리자 권한을 초기화하면서 LicenseSetup 에 표시할 사유.
// LicenseSetup 마운트 시 1회 소비됨.
export const LICENSE_RESET_REASON_KEY = "church_portal_license_reset_reason";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  memberId: string;
  memberName: string;
  username: string;
  role: "super" | "finance" | "member";
  createdAt: string;
  lastLogin?: string;
}

export type LoginResult =
  | { type: "super"; email: string; displayName: string; photoURL?: string; uid: string; isPrimary: boolean }
  | { type: "church"; admin: ChurchAdmin }
  | { type: "pending_license"; uid: string; email: string; displayName: string; photoURL?: string }
  | { type: "denied"; reason: string };

export interface SuperAccess {
  primaryEmail: string;
  delegateEmails: string[];
}

// 슈퍼유저 이메일 조회 (config/superUser.email)
export async function getSuperUserEmail(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "config", "superUser"));
    if (snap.exists()) return snap.data().email as string;
  } catch { /* ignore */ }
  return "";
}

// 주 슈퍼유저 이메일 + 대리 이메일 목록을 한 번에 조회
export async function getSuperAccess(): Promise<SuperAccess> {
  const [primary, delegates] = await Promise.all([
    getSuperUserEmail(),
    listSuperDelegates().catch(() => []),
  ]);
  return {
    primaryEmail: primary || "",
    delegateEmails: delegates.map((d) => d.email),
  };
}

// 특정 이메일이 주 슈퍼유저인지 / 대리인지 / 권한 없는지 분류
export function classifySuperRole(email: string, access: SuperAccess): "primary" | "delegate" | "none" {
  if (!email) return "none";
  const lower = email.toLowerCase();
  if (access.primaryEmail && lower === access.primaryEmail.toLowerCase()) return "primary";
  if (access.delegateEmails.some((e) => e.toLowerCase() === lower)) return "delegate";
  return "none";
}

export async function signInWithGoogle(): Promise<LoginResult> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const fbUser = credential.user;

  const access = await getSuperAccess();
  const role = fbUser.email ? classifySuperRole(fbUser.email, access) : "none";

  // 슈퍼유저 또는 슈퍼유저 대리인지 확인
  if (role === "primary" || role === "delegate") {
    return {
      type: "super",
      uid: fbUser.uid,
      email: fbUser.email || "",
      displayName: fbUser.displayName || fbUser.email || "관리자",
      photoURL: fbUser.photoURL || undefined,
      isPrimary: role === "primary",
    };
  }

  // 교회 관리자인지 확인
  const adminSnap = await getDoc(doc(db, "churchAdmins", fbUser.uid));
  if (adminSnap.exists()) {
    const admin = adminSnap.data() as ChurchAdmin;

    // 소속 교회 상태 확인
    try {
      const churchSnap = await getDoc(doc(db, "churches", admin.churchId));
      if (!churchSnap.exists()) {
        // 교회 문서가 사라짐 → 좀비 관리자 레코드 제거 후 라이선스 재등록 플로우로
        await deleteDoc(doc(db, "churchAdmins", fbUser.uid));
        sessionStorage.setItem(
          LICENSE_RESET_REASON_KEY,
          "이전 소속 교회가 시스템에서 제거되었습니다. 새 라이선스 키를 입력하거나 시스템 관리자에게 문의해주세요."
        );
        return {
          type: "pending_license",
          uid: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || fbUser.email || "관리자",
          photoURL: fbUser.photoURL || undefined,
        };
      }
      const churchStatus = getChurchStatus(churchSnap.data() as Church);
      if (churchStatus === "suspended") {
        // 정지된 교회 → 같은 교회로 재진입은 LicenseSetup 단에서 차단됨.
        // 관리자는 다른 라이선스 키를 입력하거나 문의할 수 있어야 하므로 soft-reset.
        await deleteDoc(doc(db, "churchAdmins", fbUser.uid));
        sessionStorage.setItem(
          LICENSE_RESET_REASON_KEY,
          "이전 소속 교회가 서비스 정지되어 관리자 권한이 해제되었습니다. 다른 라이선스 키를 입력하거나 시스템 관리자에게 문의해주세요."
        );
        return {
          type: "pending_license",
          uid: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || fbUser.email || "관리자",
          photoURL: fbUser.photoURL || undefined,
        };
      }
    } catch { /* 네트워크 오류는 세션 유지 */ }

    // lastLogin 업데이트
    const updated = { ...admin, lastLogin: new Date().toISOString(), photoURL: fbUser.photoURL || admin.photoURL };
    await setDoc(doc(db, "churchAdmins", fbUser.uid), updated);
    return { type: "church", admin: updated };
  }

  // 등록되지 않은 계정 → 라이선스 키 입력 대기
  return {
    type: "pending_license",
    uid: fbUser.uid,
    email: fbUser.email || "",
    displayName: fbUser.displayName || fbUser.email || "관리자",
    photoURL: fbUser.photoURL || undefined,
  };
}

export async function firebaseSignOut(): Promise<void> {
  try { await signOut(auth); } catch { /* ignore */ }
}

export async function loadChurchAdmin(uid: string): Promise<ChurchAdmin | null> {
  try {
    const snap = await getDoc(doc(db, "churchAdmins", uid));
    return snap.exists() ? (snap.data() as ChurchAdmin) : null;
  } catch { return null; }
}

export async function saveChurchAdmin(admin: ChurchAdmin): Promise<void> {
  await setDoc(doc(db, "churchAdmins", admin.uid), admin);
}

export async function deleteChurchAdmin(uid: string): Promise<void> {
  await deleteDoc(doc(db, "churchAdmins", uid));
}

export async function loadAllChurchAdmins(): Promise<ChurchAdmin[]> {
  try {
    const snap = await getDocs(collection(db, "churchAdmins"));
    return snap.docs.map((d) => d.data() as ChurchAdmin);
  } catch { return []; }
}

// 기존 코드 호환용 (사용 안 함)
export async function saveAdminUser(_admin: AdminUser): Promise<void> {}
export async function loadAdminByUid(_uid: string): Promise<AdminUser | null> { return null; }
export async function loadAllAdmins(): Promise<AdminUser[]> { return []; }
export async function deleteAdminUser(_id: string): Promise<void> {}
