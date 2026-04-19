/**
 * Church Portal - Firestore Data Storage Layer
 * churchId를 기반으로 교회별 데이터 분리
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

export type DataType = "members" | "finance" | "resources" | "settings" | "events" | "org_groups" | "admins";

// 현재 활성 교회 ID (교회 관리자 로그인 시 설정)
let _currentChurchId: string | null = null;

export function setCurrentChurchId(id: string | null): void {
  _currentChurchId = id;
}

export function getCurrentChurchId(): string | null {
  return _currentChurchId;
}

function getDocPath(dataType: DataType): string {
  if (_currentChurchId) {
    return `churchData/${_currentChurchId}/${dataType}`;
  }
  return `appData/${dataType}`;
}

export function isTauriEnv(): boolean { return false; }

export async function saveData<T>(dataType: DataType, data: T, _filename?: string): Promise<void> {
  const path = getDocPath(dataType);
  const [col, ...rest] = path.split("/");
  await setDoc(doc(db, col, rest.join("/")), { value: data, updatedAt: serverTimestamp() });
}

export async function loadData<T>(dataType: DataType, _filename?: string): Promise<T | null> {
  try {
    const path = getDocPath(dataType);
    const [col, ...rest] = path.split("/");
    const snap = await getDoc(doc(db, col, rest.join("/")));
    if (!snap.exists()) return null;
    return snap.data().value as T;
  } catch {
    return null;
  }
}

export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function saveImage(buffer: ArrayBuffer | Uint8Array, originalFilename: string): Promise<string> {
  const ext = originalFilename.split(".").pop() || "jpg";
  const filename = `images/${_currentChurchId || "global"}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const storageRef = ref(storage, filename);
  const uint8 = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  await uploadBytes(storageRef, uint8);
  return await getDownloadURL(storageRef);
}

export async function dataExists(dataType: DataType): Promise<boolean> {
  try {
    const path = getDocPath(dataType);
    const [col, ...rest] = path.split("/");
    const snap = await getDoc(doc(db, col, rest.join("/")));
    return snap.exists();
  } catch { return false; }
}

export async function saveBackup<T>(dataType: DataType, _data: T): Promise<void> {
  console.log(`Backup skipped for ${dataType}`);
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  const allData: Record<string, unknown> = {};
  const types: DataType[] = ["members", "finance", "settings", "events", "org_groups"];
  for (const t of types) {
    const d = await loadData(t);
    if (d) allData[t] = d;
  }
  return allData;
}
