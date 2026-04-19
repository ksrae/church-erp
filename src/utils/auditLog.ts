/**
 * Church Portal - Firestore 기반 활동 로그
 */

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const LOGS_COLLECTION = "activityLogs";

export type LogCategory = "MEMBER" | "FINANCE" | "SETTINGS" | "SYSTEM" | "RESOURCES" | "HELP" | "WORSHIP" | "ANNOUNCEMENT";

export interface ActivityLog {
  id: string;
  timestamp: string;
  category: LogCategory;
  action: string;
  details: string;
  user?: string;
}

export async function logActivity(
  category: LogCategory,
  action: string,
  details: string,
  user: string = "System"
): Promise<void> {
  try {
    await addDoc(collection(db, LOGS_COLLECTION), {
      timestamp: serverTimestamp(),
      category,
      action,
      details,
      user,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("activity-logged"));
    }
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function getLogs(): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const ts = data.timestamp;
      return {
        id: d.id,
        timestamp:
          ts instanceof Timestamp
            ? ts.toDate().toISOString()
            : typeof ts === "string"
            ? ts
            : new Date().toISOString(),
        category: data.category as LogCategory,
        action: data.action,
        details: data.details,
        user: data.user,
      };
    });
  } catch (error) {
    console.error("Failed to get logs:", error);
    return [];
  }
}

export async function getRecentLogs(limitCount: number = 5): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, LOGS_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const ts = data.timestamp;
      return {
        id: d.id,
        timestamp:
          ts instanceof Timestamp
            ? ts.toDate().toISOString()
            : typeof ts === "string"
            ? ts
            : new Date().toISOString(),
        category: data.category as LogCategory,
        action: data.action,
        details: data.details,
        user: data.user,
      };
    });
  } catch {
    return [];
  }
}

export async function deleteLogs(logIds: string[], user: string): Promise<void> {
  try {
    const allLogs = await getLogs();
    const toDelete = allLogs.filter((l) => logIds.includes(l.id));

    for (const id of logIds) {
      await deleteDoc(doc(db, LOGS_COLLECTION, id));
    }

    const detailsList = toDelete
      .map((log, i) => {
        const date = new Date(log.timestamp).toLocaleString("ko-KR");
        return `${i + 1}. [${date}] [${log.category}] ${log.action} - ${log.details}`;
      })
      .join("\n");

    await logActivity(
      "SYSTEM",
      "로그 삭제",
      `${user}님이 ${toDelete.length}건의 로그를 영구 삭제했습니다.\n\n[삭제된 로그 내역]\n${detailsList}`,
      user
    );
  } catch (error) {
    console.error("Failed to delete logs:", error);
    throw error;
  }
}
