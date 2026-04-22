import {
  collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "superDelegates";

export interface SuperDelegate {
  email: string;
  displayName?: string;
  addedAt: string;
  addedBy: string;
}

function emailDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

export async function listSuperDelegates(): Promise<SuperDelegate[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => d.data() as SuperDelegate);
}

export function subscribeSuperDelegates(cb: (rows: SuperDelegate[]) => void): Unsubscribe {
  return onSnapshot(collection(db, COLLECTION), (snap) => {
    cb(snap.docs.map((d) => d.data() as SuperDelegate));
  });
}

export async function addSuperDelegate(email: string, addedBy: string, displayName?: string): Promise<void> {
  const normalized = email.trim();
  if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error("유효한 이메일을 입력해주세요.");
  }
  const id = emailDocId(normalized);
  const rec: SuperDelegate = {
    email: normalized,
    displayName: displayName || "",
    addedAt: new Date().toISOString(),
    addedBy,
  };
  await setDoc(doc(db, COLLECTION, id), rec);
}

export async function removeSuperDelegate(email: string): Promise<void> {
  const id = emailDocId(email);
  await deleteDoc(doc(db, COLLECTION, id));
}
