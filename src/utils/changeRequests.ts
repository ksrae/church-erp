import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ChurchChangeRequest,
  ChurchChangeRequestItem,
  ChangeRequestStatus,
  ChurchInfoField,
} from "../types/changeRequest";

const COLLECTION = "churchChangeRequests";

export async function createChangeRequest(
  input: Omit<ChurchChangeRequest, "id" | "status" | "createdAt">
): Promise<ChurchChangeRequest> {
  const id = crypto.randomUUID();
  const req: ChurchChangeRequest = {
    ...input,
    id,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COLLECTION, id), req);
  return req;
}

export async function getChangeRequest(id: string): Promise<ChurchChangeRequest | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? (snap.data() as ChurchChangeRequest) : null;
}

export async function listPendingRequests(): Promise<ChurchChangeRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChurchChangeRequest);
}

export async function listAllRequests(): Promise<ChurchChangeRequest[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChurchChangeRequest);
}

export async function listChurchRequests(churchId: string): Promise<ChurchChangeRequest[]> {
  // orderBy 를 제거하여 Firestore 복합 인덱스 요구사항을 회피한다.
  const q = query(collection(db, COLLECTION), where("churchId", "==", churchId));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => d.data() as ChurchChangeRequest);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function subscribeChurchRequests(
  churchId: string,
  cb: (rows: ChurchChangeRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("churchId", "==", churchId));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => d.data() as ChurchChangeRequest);
    cb(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export function subscribePendingRequests(cb: (rows: ChurchChangeRequest[]) => void): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as ChurchChangeRequest));
  });
}

export async function approveRequest(
  requestId: string,
  resolver: { email: string },
  note?: string
): Promise<void> {
  const snap = await getDoc(doc(db, COLLECTION, requestId));
  if (!snap.exists()) throw new Error("요청을 찾을 수 없습니다.");
  const req = snap.data() as ChurchChangeRequest;
  if (req.status !== "pending") throw new Error("이미 처리된 요청입니다.");

  // 교회 문서에 변경 내용 적용
  const churchRef = doc(db, "churches", req.churchId);
  const churchSnap = await getDoc(churchRef);
  if (!churchSnap.exists()) throw new Error("대상 교회를 찾을 수 없습니다.");

  const patch: Record<string, string> = {};
  for (const item of req.items) {
    patch[mapFieldToChurchKey(item.field)] = item.requestedValue;
  }
  await updateDoc(churchRef, patch);

  await updateDoc(doc(db, COLLECTION, requestId), {
    status: "approved" as ChangeRequestStatus,
    resolvedAt: new Date().toISOString(),
    resolvedBy: resolver.email,
    ...(note ? { resolverNote: note } : {}),
  });
}

export async function rejectRequest(
  requestId: string,
  resolver: { email: string },
  note: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, requestId), {
    status: "rejected" as ChangeRequestStatus,
    resolvedAt: new Date().toISOString(),
    resolvedBy: resolver.email,
    resolverNote: note,
  });
}

export async function markEmailSent(requestId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, requestId), {
    emailNotifiedAt: new Date().toISOString(),
  });
}

export async function markReadByAdmin(requestId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, requestId), { readByAdmin: true });
}

// Church 문서의 name 필드는 그대로 "name" 이고, 나머지는 동일한 필드 키.
function mapFieldToChurchKey(field: ChurchInfoField): string {
  return field;
}
