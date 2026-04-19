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
import { ChurchAdmin } from "../types/church";

const SUPER_USER_CONFIG_PATH = "config/superUser";  // DB에서 직접 수정 가능

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
  | { type: "super"; email: string; displayName: string; photoURL?: string; uid: string }
  | { type: "church"; admin: ChurchAdmin }
  | { type: "pending_license"; uid: string; email: string; displayName: string; photoURL?: string }
  | { type: "denied" };

// 슈퍼유저 이메일 조회 (config/superUser.email)
export async function getSuperUserEmail(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "config", "superUser"));
    if (snap.exists()) return snap.data().email as string;
  } catch { /* ignore */ }
  return "";
}

export async function signInWithGoogle(): Promise<LoginResult> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const fbUser = credential.user;

  const superEmail = await getSuperUserEmail();

  // 슈퍼유저인지 확인
  if (fbUser.email && fbUser.email.toLowerCase() === superEmail.toLowerCase()) {
    return {
      type: "super",
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || fbUser.email,
      photoURL: fbUser.photoURL || undefined,
    };
  }

  // 교회 관리자인지 확인
  const adminSnap = await getDoc(doc(db, "churchAdmins", fbUser.uid));
  if (adminSnap.exists()) {
    const admin = adminSnap.data() as ChurchAdmin;
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
