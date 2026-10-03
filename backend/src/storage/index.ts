import type { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./localStorageProvider";

let cached: StorageProvider | undefined;

/**
 * Always returns LocalStorageProvider today. When a cloud bucket is
 * provisioned, add an S3StorageProvider implementing the same interface
 * and switch on `env.STORAGE_BUCKET` being set — no caller changes needed.
 */
export function getStorageProvider(): StorageProvider {
  if (!cached) {
    cached = new LocalStorageProvider();
  }
  return cached;
}
