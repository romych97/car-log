import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";

import { buildBackupPayload } from "@/backup/database";
import {
  getLastExportUri,
  loadLastExportUriFromDisk,
  rememberLastExportUri,
} from "@/backup/lastExport";
import { readTextFromUri } from "@/backup/readUri";
import { normalizeBackupRaw } from "@/backup/text";

const EXPORT_CACHE_SUBDIR = "carlog-exports/";

function backupFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `carlog-backup-${stamp}.json`;
}

export function getLastExportCacheUri(): string | null {
  return getLastExportUri();
}

export { loadLastExportUriFromDisk };

async function ensureDirectory(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

/** Writable path for Sharing (cache). Persistent copy kept in documents when available. */
async function writeBackupFiles(json: string, fileName: string): Promise<{
  shareUri: string;
  persistUri: string;
}> {
  const cacheDir = FileSystem.cacheDirectory;
  const docDir = FileSystem.documentDirectory;

  if (!cacheDir && !docDir) {
    throw new Error("no_cache_dir");
  }

  let shareUri: string;
  if (cacheDir) {
    const exportDir = `${cacheDir}${EXPORT_CACHE_SUBDIR}`;
    await ensureDirectory(exportDir);
    shareUri = `${exportDir}${fileName}`;
    await FileSystem.writeAsStringAsync(shareUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } else {
    shareUri = `${docDir}${fileName}`;
    await FileSystem.writeAsStringAsync(shareUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  let persistUri = shareUri;
  if (docDir && shareUri.startsWith(cacheDir ?? "")) {
    persistUri = `${docDir}${fileName}`;
    await FileSystem.writeAsStringAsync(persistUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  return { shareUri, persistUri };
}

export async function exportAndShareBackup(db: SQLiteDatabase): Promise<void> {
  const payload = await buildBackupPayload(db);
  const json = JSON.stringify(payload, null, 2);
  const fileName = backupFileName();
  const { shareUri, persistUri } = await writeBackupFiles(json, fileName);
  await rememberLastExportUri(persistUri);

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("sharing_unavailable");
  }

  const shareInfo = await FileSystem.getInfoAsync(shareUri);
  if (!shareInfo.exists) {
    throw new Error("export_file_missing");
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: "application/json",
    dialogTitle: fileName,
    UTI: "public.json",
  });
}

async function readTextFromDocumentAsset(
  asset: DocumentPickerAsset,
): Promise<string> {
  if (Platform.OS === "web" && asset.file) {
    return normalizeBackupRaw(await asset.file.text());
  }
  return readTextFromUri(asset.uri);
}

export async function readBackupFromPicker(): Promise<string> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error("canceled");
  }

  return readTextFromDocumentAsset(result.assets[0]);
}

export async function readLastExportBackup(): Promise<string> {
  const uri = getLastExportUri();
  if (!uri) {
    throw new Error("no_last_export");
  }
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("no_last_export");
  }
  return readTextFromUri(uri);
}
