import * as FileSystem from "expo-file-system/legacy";

const META_FILE = "carlog-last-export-uri.txt";

let lastExportUri: string | null = null;

export function getLastExportUri(): string | null {
  return lastExportUri;
}

export async function loadLastExportUriFromDisk(): Promise<string | null> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return null;
  const metaPath = `${dir}${META_FILE}`;
  try {
    const info = await FileSystem.getInfoAsync(metaPath);
    if (!info.exists) {
      lastExportUri = null;
      return null;
    }
    const uri = (await FileSystem.readAsStringAsync(metaPath)).trim();
    if (!uri) {
      lastExportUri = null;
      return null;
    }
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      lastExportUri = null;
      return null;
    }
    lastExportUri = uri;
    return uri;
  } catch {
    lastExportUri = null;
    return null;
  }
}

export async function rememberLastExportUri(uri: string): Promise<void> {
  lastExportUri = uri;
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  const metaPath = `${dir}${META_FILE}`;
  await FileSystem.writeAsStringAsync(metaPath, uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
