import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ChurchStatusRequest,
  StatusRequestAction,
  StatusRequestStatus,
} from "../types/statusRequest";
import { Church, ChurchStatus } from "../types/church";

const COLLECTION = "churchStatusRequests";

export async function createStatusRequest(
  input: Omit<ChurchStatusRequest, "id" | "status" | "createdAt">
): Promise<ChurchStatusRequest> {
  const id = crypto.randomUUID();
  const req: ChurchStatusRequest = {
    ...input,
    id,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COLLECTION, id), req);
  return req;
}

export async function listAllStatusRequests(): Promise<ChurchStatusRequest[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChurchStatusRequest);
}

export function subscribePendingStatusRequests(
  cb: (rows: ChurchStatusRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as ChurchStatusRequest));
  });
}

export function subscribeAllStatusRequests(
  cb: (rows: ChurchStatusRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as ChurchStatusRequest));
  });
}

export function subscribeRequesterStatusRequests(
  requesterUid: string,
  cb: (rows: ChurchStatusRequest[]) => void
): Unsubscribe {
  // 복합 인덱스 회피 — requesterUid 만 필터하고 클라이언트에서 정렬
  const q = query(collection(db, COLLECTION), where("requesterUid", "==", requesterUid));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => d.data() as ChurchStatusRequest);
    cb(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export async function resolveStatusRequest(
  requestId: string,
  action: StatusRequestAction,
  resolver: { email: string },
  note: string
): Promise<void> {
  const reqSnap = await getDoc(doc(db, COLLECTION, requestId));
  if (!reqSnap.exists()) throw new Error("요청을 찾을 수 없습니다.");
  const req = reqSnap.data() as ChurchStatusRequest;
  if (req.status !== "pending") throw new Error("이미 처리된 요청입니다.");

  let nextChurchStatus: ChurchStatus | undefined;
  const applyToChurch = action !== "none" && !!req.churchId;

  if (applyToChurch) {
    const churchRef = doc(db, "churches", req.churchId as string);
    const churchSnap = await getDoc(churchRef);
    if (!churchSnap.exists()) {
      // 이미 삭제된 교회 — action 이 delete 면 그냥 pass, 다른 경우 상태변경 불가
      if (action !== "delete") {
        throw new Error("대상 교회 문서가 존재하지 않아 상태를 변경할 수 없습니다.");
      }
    } else {
      if (action === "delete") {
        await deleteDoc(churchRef);
      } else {
        const mapping: Record<Exclude<StatusRequestAction, "none" | "delete">, ChurchStatus> = {
          activate: "active",
          hold: "hold",
          suspend: "suspended",
        };
        const s = mapping[action as Exclude<StatusRequestAction, "none" | "delete">];
        const patch: Partial<Church> = {
          status: s,
          isActive: s !== "suspended",
          statusReason: note || (churchSnap.data() as Church).statusReason || "",
          statusChangedAt: new Date().toISOString(),
        };
        await updateDoc(churchRef, patch as any);
        nextChurchStatus = s;
      }
    }
  }

  const status: StatusRequestStatus = action === "none" ? "rejected" : "resolved";
  await updateDoc(doc(db, COLLECTION, requestId), {
    status,
    resolvedAction: action,
    resolvedAt: new Date().toISOString(),
    resolvedBy: resolver.email,
    resolverNote: note,
    ...(nextChurchStatus ? { resolvedChurchStatus: nextChurchStatus } : {}),
  });
}

export async function markStatusRequestReadByAdmin(requestId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, requestId), { readByAdmin: true });
}
