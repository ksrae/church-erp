/**
 * Church ERP - File Storage Utility (Simplified)
 * Tauri 파일 시스템 API를 사용하여 데이터를 로컬 폴더에 저장
 * 단순화된 버전: 주차별 폴더 없이 단일 파일로 관리
 */

import {
  writeTextFile,
  writeBinaryFile,
  readTextFile,
  createDir,
  exists,
  BaseDirectory,
} from "@tauri-apps/api/fs";
import { appDataDir, join } from "@tauri-apps/api/path";

// 데이터 타입 정의
export type DataType = "members" | "finance" | "resources" | "settings" | "events" | "org_groups" | "admins";

/**
 * Tauri 환경 여부 확인
 */
export function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// 디렉토리 생성 (존재하지 않으면)
async function ensureDirectory(path: string): Promise<void> {
  try {
    const pathExists = await exists(path, { dir: BaseDirectory.AppData });
    if (!pathExists) {
      await createDir(path, { dir: BaseDirectory.AppData, recursive: true });
    }
  } catch (error) {
    console.error("Failed to create directory:", error);
  }
}

/**
 * 데이터 디렉토리 경로 가져오기 (외부에서도 사용 가능)
 */
export async function getDataPath(dataType: DataType): Promise<string> {
  const basePath = await appDataDir();
  return `${basePath}data/${dataType}`;
}

/**
 * 데이터 저장 (단순화: 단일 파일)
 * @param dataType 데이터 타입 (members, finance, resources, settings)
 * @param data 저장할 데이터
 * @param filename 파일 이름 (기본: data.json)
 */
export async function saveData<T>(
  dataType: DataType,
  data: T,
  filename: string = "data.json"
): Promise<void> {
  if (!isTauriEnv()) {
    console.warn("Not in Tauri environment, cannot save to file");
    return;
  }

  try {
    const dirPath = `data/${dataType}`;

    // 디렉토리 생성
    await ensureDirectory(dirPath);

    // 데이터 저장
    const filePath = `${dirPath}/${filename}`;
    const jsonData = JSON.stringify(data, null, 2);

    await writeTextFile(filePath, jsonData, { dir: BaseDirectory.AppData });

    console.log(`✅ Data saved successfully: ${filePath}`);
  } catch (error) {
    console.error("❌ Failed to save data:", error);
    throw error;
  }
}

/**
 * 데이터 로드 (단순화: 단일 파일)
 * @param dataType 데이터 타입
 * @param filename 파일 이름 (기본: data.json)
 */
export async function loadData<T>(
  dataType: DataType,
  filename: string = "data.json"
): Promise<T | null> {
  if (!isTauriEnv()) {
    console.warn("Not in Tauri environment, cannot load from file");
    return null;
  }

  try {
    const filePath = `data/${dataType}/${filename}`;

    const fileExists = await exists(filePath, { dir: BaseDirectory.AppData });
    if (!fileExists) {
      console.log(`📁 File not found: ${filePath}`);
      return null;
    }

    const jsonData = await readTextFile(filePath, { dir: BaseDirectory.AppData });
    const parsed = JSON.parse(jsonData) as T;
    console.log(`✅ Data loaded successfully: ${filePath}`);
    return parsed;
  } catch (error) {
    console.error("❌ Failed to load data:", error);
    return null;
  }
}

/**
 * 현재 주차 정보 가져오기 (백업용)
 */
export function getCurrentWeekInfo(): { year: number; week: number; folderName: string } {
  const date = new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return {
    year: d.getUTCFullYear(),
    week: weekNo,
    folderName: `${d.getUTCFullYear()}_W${weekNo.toString().padStart(2, "0")}`,
  };
}

/**
 * 백업 데이터 저장 (주차별)
 */
export async function saveBackup<T>(
  dataType: DataType,
  data: T,
  filename: string = "data.json"
): Promise<void> {
  if (!isTauriEnv()) return;

  try {
    const { folderName } = getCurrentWeekInfo();
    const dirPath = `data/${dataType}/backups/${folderName}`;

    await ensureDirectory(dirPath);

    const filePath = `${dirPath}/${filename}`;
    const jsonData = JSON.stringify(data, null, 2);

    await writeTextFile(filePath, jsonData, { dir: BaseDirectory.AppData });
    console.log(`📦 Backup saved: ${filePath}`);
  } catch (error) {
    console.error("Failed to save backup:", error);
  }
}

/**
 * 데이터 내보내기 (백업용)
 */
export async function exportAllData(): Promise<Record<string, unknown>> {
  const allData: Record<string, unknown> = {};
  const dataTypes: DataType[] = ["members", "finance", "resources", "settings", "events", "org_groups"];

  for (const dataType of dataTypes) {
    const data = await loadData(dataType);
    if (data) {
      allData[dataType] = data;
    }
  }

  return allData;
}

/**
 * 이미지 파일 저장
 * @param buffer 이미지 데이터 (ArrayBuffer or Uint8Array)
 * @param originalFilename 원본 파일명 (확장자 추출용)
 * @returns 저장된 파일의 상대 경로 (예: images/123456789.jpg)
 */
export async function saveImage(
  buffer: ArrayBuffer | Uint8Array,
  originalFilename: string
): Promise<string> {
  if (!isTauriEnv()) {
    console.warn("Browser environment detected: Skipping file save.");
    return "";
  }

  try {
    const imagesDir = "images";
    await ensureDirectory(imagesDir);

    const ext = originalFilename.split(".").pop() || "jpg";
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${imagesDir}/${filename}`;

    const appDataDirPath = await appDataDir();
    const fullPath = await join(appDataDirPath, imagesDir, filename);

    await writeBinaryFile(filePath, buffer, { dir: BaseDirectory.AppData });
    console.log(`Image saved: ${fullPath}`);

    return fullPath;
  } catch (error) {
    console.error("Failed to save image:", error);
    throw error;
  }
}

/**
 * 데이터 파일 존재 여부 확인
 */
export async function dataExists(
  dataType: DataType,
  filename: string = "data.json"
): Promise<boolean> {
  if (!isTauriEnv()) return false;

  try {
    const filePath = `data/${dataType}/${filename}`;
    return await exists(filePath, { dir: BaseDirectory.AppData });
  } catch {
    return false;
  }
}
