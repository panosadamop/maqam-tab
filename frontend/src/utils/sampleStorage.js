/**
 * sampleStorage.js
 *
 * Persists user's sample folder using:
 *  - File System Access API  (showDirectoryPicker) — Chrome/Edge 86+
 *  - IndexedDB               — stores the FileSystemDirectoryHandle across sessions
 *
 * The directory handle survives page reloads. On next open, the user sees
 * a "Re-connect" prompt (browser requires a permission re-grant click).
 *
 * API:
 *   pickSampleFolder()              → Promise<FolderInfo | null>
 *   reconnectSavedFolder()          → Promise<FolderInfo | null>
 *   getSavedFolderName()            → Promise<string | null>
 *   clearSavedFolder()              → Promise<void>
 *   readAudioFilesFromHandle(handle)→ Promise<File[]>
 *   isFSASupported()                → bool
 *
 * FolderInfo: { handle, name, files: File[], audioCount: number }
 */

const DB_NAME    = "maqamtab_samples";
const DB_VERSION = 1;
const STORE_NAME = "folder_handle";
const HANDLE_KEY = "oud_samples_dir";

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function dbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── File System Access API support check ─────────────────────────────────────

export function isFSASupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// ── Read audio files from a directory handle ──────────────────────────────────

const AUDIO_EXTS = new Set([".mp3",".wav",".ogg",".flac",".aac",".m4a",".opus"]);

export async function readAudioFilesFromHandle(dirHandle) {
  const files = [];
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind !== "file") continue;
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    if (!AUDIO_EXTS.has(ext)) continue;
    const file = await entry.getFile();
    files.push(file);
  }
  return files;
}

// ── Pick a new folder ─────────────────────────────────────────────────────────

export async function pickSampleFolder() {
  if (!isFSASupported()) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    await dbSet(HANDLE_KEY, handle);
    const files = await readAudioFilesFromHandle(handle);
    return {
      handle,
      name: handle.name,
      files,
      audioCount: files.length,
    };
  } catch (e) {
    // User cancelled or permission denied
    if (e.name === "AbortError") return null;
    throw e;
  }
}

// ── Reconnect a previously saved folder ──────────────────────────────────────
// Browser requires a user gesture AND re-grants permission on reload.
// Call this inside a button click handler.

export async function reconnectSavedFolder() {
  const handle = await dbGet(HANDLE_KEY);
  if (!handle) return null;
  try {
    // Request permission (requires user gesture)
    const perm = await handle.requestPermission({ mode: "read" });
    if (perm !== "granted") return null;
    const files = await readAudioFilesFromHandle(handle);
    return {
      handle,
      name: handle.name,
      files,
      audioCount: files.length,
    };
  } catch (e) {
    // Handle may be stale (drive unmounted, folder deleted, etc.)
    await dbDelete(HANDLE_KEY);
    return null;
  }
}

// ── Check if a saved folder name exists (no permission needed) ────────────────

export async function getSavedFolderName() {
  try {
    const handle = await dbGet(HANDLE_KEY);
    return handle?.name ?? null;
  } catch {
    return null;
  }
}

// ── Clear saved folder ────────────────────────────────────────────────────────

export async function clearSavedFolder() {
  await dbDelete(HANDLE_KEY);
}

// ── Watch folder for changes (polling) ───────────────────────────────────────
// Returns a stop function. Calls onChange(files) when file list changes.

export function watchFolder(handle, onChange, intervalMs = 3000) {
  let lastSnapshot = "";
  let timer = null;

  async function check() {
    try {
      const files = await readAudioFilesFromHandle(handle);
      // Build a quick snapshot string: name+size pairs
      const snap = files.map(f => `${f.name}:${f.size}`).sort().join("|");
      if (snap !== lastSnapshot) {
        lastSnapshot = snap;
        onChange(files);
      }
    } catch {
      // Folder may have been removed
    }
  }

  check(); // immediate first check
  timer = setInterval(check, intervalMs);
  return () => clearInterval(timer);
}
