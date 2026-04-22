import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../firebase";
import {
  Resource,
  ResourceCategory,
  ResourceVisibility,
  RESOURCE_MAX_BYTES,
} from "../types/resource";

const COLLECTION = "resources";

interface UploadResourceInput {
  churchId: string;
  title: string;
  description?: string;
  category: ResourceCategory;
  visibility: ResourceVisibility;
  file: File;
  uploadedBy?: string;
  uploaderName?: string;
}

export async function uploadResource(input: UploadResourceInput): Promise<Resource> {
  if (input.file.size > RESOURCE_MAX_BYTES) {
    throw new Error("파일 크기가 5MB를 초과합니다.");
  }
  const id = crypto.randomUUID();
  const safeName = input.file.name.replace(/[^\w.\-]/g, "_");
  const path = `churches/${input.churchId}/resources/${id}_${safeName}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, input.file, { contentType: input.file.type || undefined });
  const url = await getDownloadURL(ref);

  const resource: Resource = {
    id,
    churchId: input.churchId,
    title: input.title.trim(),
    description: input.description?.trim() || "",
    category: input.category,
    visibility: input.visibility,
    fileUrl: url,
    fileName: input.file.name,
    fileSize: input.file.size,
    fileType: input.file.type || "",
    storagePath: path,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
    uploaderName: input.uploaderName,
  };
  await setDoc(doc(db, COLLECTION, id), resource);
  return resource;
}

export function subscribeResources(
  churchId: string,
  cb: (rows: Resource[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where("churchId", "==", churchId));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => d.data() as Resource);
    cb(rows.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
  });
}

export function subscribePublicResources(
  churchId: string,
  cb: (rows: Resource[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where("churchId", "==", churchId),
    where("visibility", "==", "public")
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => d.data() as Resource);
    cb(rows.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
  });
}

export async function updateResource(
  id: string,
  patch: Partial<Pick<Resource, "title" | "description" | "category" | "visibility">>
): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) clean.title = patch.title.trim();
  if (patch.description !== undefined) clean.description = patch.description.trim();
  if (patch.category !== undefined) clean.category = patch.category;
  if (patch.visibility !== undefined) clean.visibility = patch.visibility;
  await updateDoc(doc(db, COLLECTION, id), clean);
}

export async function deleteResource(resource: Resource): Promise<void> {
  try {
    await deleteObject(storageRef(storage, resource.storagePath));
  } catch {
    // 파일이 이미 없거나 접근 불가 — Firestore 삭제는 계속 진행
  }
  await deleteDoc(doc(db, COLLECTION, resource.id));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
