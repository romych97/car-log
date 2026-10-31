import * as FileSystem from "expo-file-system/legacy";

const EXPORT_CACHE_SUBDIR = "carlog-exports/";

async function ensureDirectory(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

/** Copy a file into app cache so Expo Sharing can read it on Android. */
export async function copyToShareCache(
  sourceUri: string,
  fileName: string,
): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("no_cache_dir");
  }

  const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
  if (!sourceInfo.exists) {
    throw new Error("export_file_missing");
  }

  const exportDir = `${cacheDir}${EXPORT_CACHE_SUBDIR}`;
  await ensureDirectory(exportDir);
  const destUri = `${exportDir}${fileName}`;

  await FileSystem.deleteAsync(destUri, { idempotent: true });

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  } catch {
    const base64 = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(destUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const destInfo = await FileSystem.getInfoAsync(destUri);
  if (!destInfo.exists) {
    throw new Error("export_file_missing");
  }

  return destUri;
}

/** Write base64 file bytes into share cache (e.g. PDF from printToFileAsync). */
export async function writeBase64ToShareCache(
  base64: string,
  fileName: string,
): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("no_cache_dir");
  }

  const exportDir = `${cacheDir}${EXPORT_CACHE_SUBDIR}`;
  await ensureDirectory(exportDir);
  const destUri = `${exportDir}${fileName}`;

  await FileSystem.deleteAsync(destUri, { idempotent: true });
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const destInfo = await FileSystem.getInfoAsync(destUri);
  if (!destInfo.exists) {
    throw new Error("export_file_missing");
  }

  return destUri;
}
