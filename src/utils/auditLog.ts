
import {
  writeBinaryFile,
  readBinaryFile,
  createDir,
  exists,
  BaseDirectory,
} from "@tauri-apps/api/fs";
import { appDataDir } from "@tauri-apps/api/path";

const LOG_DIR = "logs";
const LOG_FILE = "activity_log.bin";

export type LogCategory = "MEMBER" | "FINANCE" | "SETTINGS" | "SYSTEM" | "RESOURCES" | "HELP";

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  category: LogCategory;
  action: string; // Short title, e.g., "Settings Updated"
  details: string; // Description
  user?: string; // Optional user identifier
}

/**
 * Ensures the log directory exists
 */
async function ensureLogDirectory(): Promise<void> {
  try {
    const dirExists = await exists(LOG_DIR, { dir: BaseDirectory.AppData });
    if (!dirExists) {
      await createDir(LOG_DIR, { dir: BaseDirectory.AppData, recursive: true });
    }
  } catch (error) {
    console.error("Failed to create log directory:", error);
  }
}

/**
 * Reads all logs from the binary file
 */
export async function getLogs(): Promise<ActivityLog[]> {
  try {
    const filePath = `${LOG_DIR}/${LOG_FILE}`;
    const fileExists = await exists(filePath, { dir: BaseDirectory.AppData });

    if (!fileExists) {
      return [];
    }

    const binaryData = await readBinaryFile(filePath, { dir: BaseDirectory.AppData });
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(binaryData);

    try {
      return JSON.parse(jsonString) as ActivityLog[];
    } catch (e) {
      console.error("Failed to parse log file:", e);
      return [];
    }
  } catch (error) {
    console.error("Failed to read logs:", error);
    return [];
  }
}

/**
 * Writes logs to the binary file
 */
async function saveLogs(logs: ActivityLog[]): Promise<void> {
  try {
    await ensureLogDirectory();
    const filePath = `${LOG_DIR}/${LOG_FILE}`;
    const jsonString = JSON.stringify(logs);
    const textEncoder = new TextEncoder();
    const binaryData = textEncoder.encode(jsonString);

    await writeBinaryFile(filePath, binaryData, { dir: BaseDirectory.AppData });
  } catch (error) {
    console.error("Failed to save logs:", error);
  }
}

/**
 * Logs a new activity
 */
export async function logActivity(
  category: LogCategory,
  action: string,
  details: string,
  user: string = "Current User"
): Promise<void> {
  const newLog: ActivityLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    category,
    action,
    details,
    user
  };

  const logs = await getLogs();
  // Prepend new log
  const updatedLogs = [newLog, ...logs];

  await saveLogs(updatedLogs);

  // Dispatch event to notify listeners (e.g. Layout component)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("activity-logged"));
  }
}

/**
 * Get recent logs (for notification dropdown)
 */
export async function getRecentLogs(limit: number = 5): Promise<ActivityLog[]> {
  const logs = await getLogs();
  return logs.slice(0, limit);
}

/**
 * Delete specified logs and record the deletion activity
 */
/**
 * Delete specified logs and record the deletion activity
 */
export async function deleteLogs(logIds: string[], user: string): Promise<void> {
  try {
    const logs = await getLogs();
    const logsToDelete = logs.filter(log => logIds.includes(log.id));
    const updatedLogs = logs.filter(log => !logIds.includes(log.id));

    if (logsToDelete.length === 0) return;

    // Create detailed description of deleted logs
    const detailsList = logsToDelete.map((log, index) => {
      const date = new Date(log.timestamp).toLocaleString('ko-KR');
      return `${index + 1}. [${date}] [${log.category}] ${log.action} - ${log.details}`;
    }).join('\n');

    const summary = `${user}님이 ${logsToDelete.length}건의 로그를 영구 삭제했습니다.\n\n[삭제된 로그 내역]\n${detailsList}`;

    // Save filtered logs first
    await saveLogs(updatedLogs);

    // Then log the deletion activity
    await logActivity(
      "SYSTEM",
      "로그 삭제",
      summary,
      user
    );

  } catch (error) {
    console.error("Failed to delete logs:", error);
    throw error;
  }
}
