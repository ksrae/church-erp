/**
 * Church ERP - File Storage Utility
 * Tauri 파일 시스템 API를 사용하여 데이터를 로컬 폴더에 주간 단위로 저장
 */

import {
  writeTextFile,
  writeBinaryFile,
  readTextFile,
  createDir,
  exists,
  readDir,
  BaseDirectory,
} from "@tauri-apps/api/fs";
import { appDataDir, join } from "@tauri-apps/api/path";

// 데이터 타입 정의
export type DataType = "members" | "finance" | "resources" | "settings" | "events" | "org_groups";

// 주차 계산 (ISO 주차)
function getWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

// 주간 폴더 이름 생성 (예: 2024_W03)
function getWeekFolderName(date: Date = new Date()): string {
  const { year, week } = getWeekNumber(date);
  return `${year}_W${week.toString().padStart(2, "0")}`;
}

// 데이터 디렉토리 경로 가져오기 (외부에서도 사용 가능)
export async function getDataPath(dataType: DataType): Promise<string> {
  const basePath = await appDataDir();
  return `${basePath}data/${dataType}`;
}

// 디렉토리 생성 (존재하지 않으면)
async function ensureDirectory(path: string): Promise<void> {
  const pathExists = await exists(path, { dir: BaseDirectory.AppData });
  if (!pathExists) {
    await createDir(path, { dir: BaseDirectory.AppData, recursive: true });
  }
}

/**
 * 데이터 저장
 * @param dataType 데이터 타입 (members, finance, resources, settings)
 * @param data 저장할 데이터
 * @param filename 파일 이름 (기본: data.json)
 */
export async function saveData<T>(
  dataType: DataType,
  data: T,
  filename: string = "data.json"
): Promise<void> {
  try {
    const weekFolder = getWeekFolderName();
    const dirPath = `data/${dataType}/${weekFolder}`;

    // 디렉토리 생성
    await ensureDirectory(dirPath);

    // 데이터 저장
    const filePath = `${dirPath}/${filename}`;
    const jsonData = JSON.stringify(data, null, 2);

    await writeTextFile(filePath, jsonData, { dir: BaseDirectory.AppData });

    console.log(`Data saved: ${filePath}`);
  } catch (error) {
    console.error("Failed to save data:", error);
    // Tauri API 사용 불가시 localStorage 폴백
    fallbackSave(dataType, data, filename);
  }
}

/**
 * 데이터 로드
 * @param dataType 데이터 타입
 * @param filename 파일 이름 (기본: data.json)
 * @param weekFolder 특정 주차 폴더 (기본: 현재 주차)
 */
export async function loadData<T>(
  dataType: DataType,
  filename: string = "data.json",
  weekFolder?: string
): Promise<T | null> {
  try {
    const folder = weekFolder || getWeekFolderName();
    const filePath = `data/${dataType}/${folder}/${filename}`;

    const fileExists = await exists(filePath, { dir: BaseDirectory.AppData });
    if (!fileExists) {
      // 현재 주차에 데이터가 없으면 가장 최근 주차에서 로드
      if (!weekFolder) {
        const latestData = await loadLatestData<T>(dataType, filename);
        return latestData;
      }
      return null;
    }

    const jsonData = await readTextFile(filePath, { dir: BaseDirectory.AppData });
    return JSON.parse(jsonData) as T;
  } catch (error) {
    console.error("Failed to load data:", error);
    // Tauri API 사용 불가시 localStorage 폴백
    return fallbackLoad<T>(dataType, filename);
  }
}

/**
 * 가장 최근 주차의 데이터 로드
 */
async function loadLatestData<T>(
  dataType: DataType,
  filename: string
): Promise<T | null> {
  try {
    const dirPath = `data/${dataType}`;
    const dirExists = await exists(dirPath, { dir: BaseDirectory.AppData });

    if (!dirExists) return null;

    const entries = await readDir(dirPath, { dir: BaseDirectory.AppData });

    // 주차 폴더 정렬 (최신순)
    const weekFolders = entries
      .filter((e) => e.children !== undefined) // 폴더만
      .map((e) => e.name || "")
      .filter((name) => /^\d{4}_W\d{2}$/.test(name))
      .sort()
      .reverse();

    // 가장 최근 주차부터 데이터 찾기
    for (const folder of weekFolders) {
      const data = await loadData<T>(dataType, filename, folder);
      if (data) return data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 모든 주차 데이터 목록 가져오기
 */
export async function getWeeklyDataList(
  dataType: DataType
): Promise<string[]> {
  try {
    const dirPath = `data/${dataType}`;
    const dirExists = await exists(dirPath, { dir: BaseDirectory.AppData });

    if (!dirExists) return [];

    const entries = await readDir(dirPath, { dir: BaseDirectory.AppData });

    return entries
      .filter((e) => e.children !== undefined)
      .map((e) => e.name || "")
      .filter((name) => /^\d{4}_W\d{2}$/.test(name))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// LocalStorage 폴백 함수들
function fallbackSave<T>(dataType: DataType, data: T, filename: string): void {
  const weekFolder = getWeekFolderName();
  const key = `church_erp_${dataType}_${weekFolder}_${filename}`;
  localStorage.setItem(key, JSON.stringify(data));
}

function fallbackLoad<T>(dataType: DataType, filename: string): T | null {
  // 현재 주차 먼저 시도
  const weekFolder = getWeekFolderName();
  const key = `church_erp_${dataType}_${weekFolder}_${filename}`;
  const data = localStorage.getItem(key);

  if (data) {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  // 이전 주차들에서 찾기
  const keys = Object.keys(localStorage)
    .filter((k) => k.startsWith(`church_erp_${dataType}_`) && k.endsWith(`_${filename}`))
    .sort()
    .reverse();

  for (const k of keys) {
    const storedData = localStorage.getItem(k);
    if (storedData) {
      try {
        return JSON.parse(storedData) as T;
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * 현재 주차 정보 가져오기
 */
export function getCurrentWeekInfo(): { year: number; week: number; folderName: string } {
  const { year, week } = getWeekNumber(new Date());
  return {
    year,
    week,
    folderName: getWeekFolderName(),
  };
}

/**
 * 데이터 내보내기 (백업용)
 */
export async function exportAllData(): Promise<Record<string, unknown>> {
  const allData: Record<string, unknown> = {};
  const dataTypes: DataType[] = ["members", "finance", "resources", "settings"];

  for (const dataType of dataTypes) {
    const data = await loadData(dataType);
    if (data) {
      allData[dataType] = data;
    }
  }

  return allData;
}

/**
 * Tauri 환경 여부 확인
 */
export function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
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
