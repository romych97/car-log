import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { normalizeBackupRaw } from "@/backup/text";

async function readFileUriWithFetch(uri: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

async function readFileUriWithExpoFile(uri: string): Promise<string | null> {
  try {
    return await new File(uri).text();
  } catch {
    try {
      const buffer = await new File(uri).arrayBuffer();
      return new TextDecoder("utf-8").decode(buffer);
    } catch {
      return null;
    }
  }
}

async function readFileUriWithLegacy(uri: string): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    return null;
  }
}

async function readNativeFileUri(uri: string): Promise<string> {
  const viaFetch = await readFileUriWithFetch(uri);
  if (viaFetch != null) {
    return viaFetch;
  }

  const viaFile = await readFileUriWithExpoFile(uri);
  if (viaFile != null) {
    return viaFile;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (cacheDir && uri.startsWith("file://") && uri.includes("/DocumentPicker/")) {
    const dest = `${cacheDir}carlog-import-${Date.now()}.json`;
    try {
      await FileSystem.copyAsync({ from: uri, to: dest });
      const copied =
        (await readFileUriWithFetch(dest)) ??
        (await readFileUriWithExpoFile(dest)) ??
        (await readFileUriWithLegacy(dest));
      if (copied != null) {
        return copied;
      }
    } catch {
      // fall through
    }
  }

  const viaLegacy = await readFileUriWithLegacy(uri);
  if (viaLegacy != null) {
    return viaLegacy;
  }

  throw new Error("read_failed");
}

export async function readTextFromUri(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const text = await readFileUriWithFetch(uri);
    if (text == null) {
      throw new Error("read_failed");
    }
    return normalizeBackupRaw(text);
  }

  if (uri.startsWith("content://")) {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error("no_cache_dir");
    }
    const dest = `${cacheDir}carlog-import-${Date.now()}.json`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return normalizeBackupRaw(await readNativeFileUri(dest));
  }

  return normalizeBackupRaw(await readNativeFileUri(uri));
}
