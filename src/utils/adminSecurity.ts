/**
 * Admin Data Security Utility
 * - Password hashing with SHA-256 + salt
 * - Binary file storage (not readable as plain text)
 */

import {
  writeBinaryFile,
  readBinaryFile,
  exists,
  createDir,
  BaseDirectory,
} from "@tauri-apps/api/fs";

const ADMIN_FILE_PATH = "data/admins/admin.dat";
const SALT = "church_erp_2024_secure_salt";

/**
 * Hash password using SHA-256 with salt
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

/**
 * Encode data to binary (XOR obfuscation + Base64)
 */
function encodeDataToBinary(data: string): Uint8Array {
  // Simple XOR obfuscation key
  const key = [0x4C, 0x6F, 0x72, 0x64, 0x21]; // "Lord!"

  // First, Base64 encode the JSON string
  const base64 = btoa(unescape(encodeURIComponent(data)));

  // Then XOR each byte with key
  const encoder = new TextEncoder();
  const bytes = encoder.encode(base64);
  const obfuscated = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i++) {
    obfuscated[i] = bytes[i] ^ key[i % key.length];
  }

  return obfuscated;
}

/**
 * Decode binary data back to string
 */
function decodeBinaryToData(binary: Uint8Array): string {
  // XOR key (same as encode)
  const key = [0x4C, 0x6F, 0x72, 0x64, 0x21]; // "Lord!"

  // Reverse XOR
  const deobfuscated = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    deobfuscated[i] = binary[i] ^ key[i % key.length];
  }

  // Decode from bytes to string
  const decoder = new TextDecoder();
  const base64 = decoder.decode(deobfuscated);

  // Decode Base64
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    throw new Error("Failed to decode admin data");
  }
}

/**
 * Save admin data as encrypted binary file
 */
export async function saveAdminData<T>(data: T): Promise<void> {
  try {
    // Ensure directory exists
    const dirExists = await exists("data/admins", { dir: BaseDirectory.AppData });
    if (!dirExists) {
      await createDir("data/admins", { dir: BaseDirectory.AppData, recursive: true });
    }

    // Convert to JSON
    const jsonString = JSON.stringify(data, null, 0);

    // Encode to binary
    const binaryData = encodeDataToBinary(jsonString);

    // Write binary file
    await writeBinaryFile(ADMIN_FILE_PATH, binaryData, { dir: BaseDirectory.AppData });

    console.log("✅ Admin data saved securely");
  } catch (error) {
    console.error("❌ Failed to save admin data:", error);
    throw error;
  }
}

/**
 * Load admin data from encrypted binary file
 */
export async function loadAdminData<T>(): Promise<T | null> {
  try {
    const fileExists = await exists(ADMIN_FILE_PATH, { dir: BaseDirectory.AppData });
    if (!fileExists) {
      return null;
    }

    // Read binary file
    const binaryData = await readBinaryFile(ADMIN_FILE_PATH, { dir: BaseDirectory.AppData });

    // Decode from binary
    const jsonString = decodeBinaryToData(binaryData);

    // Parse JSON
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("❌ Failed to load admin data:", error);
    return null;
  }
}
