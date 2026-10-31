export function normalizeBackupRaw(raw: string): string {
  return raw.replace(/^\uFEFF/, "").trim();
}

export function importErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
