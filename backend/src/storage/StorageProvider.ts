export interface SavedFile {
  /** Relative path, safe to store in the DB (e.g. Resume.filePath). */
  storagePath: string;
}

export interface StorageProvider {
  save(params: { buffer: Buffer; originalName: string; subfolder: string }): Promise<SavedFile>;
  /** Resolve a stored path back to bytes on disk, for text extraction. */
  readAbsolutePath(storagePath: string): string;
}
