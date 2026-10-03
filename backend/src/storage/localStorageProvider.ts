import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { StorageProvider, SavedFile } from "./StorageProvider";
import { env } from "../config/env";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

export class LocalStorageProvider implements StorageProvider {
  private root = path.resolve(env.STORAGE_ROOT);

  async save({ buffer, originalName, subfolder }: { buffer: Buffer; originalName: string; subfolder: string }): Promise<SavedFile> {
    const dir = path.join(this.root, subfolder);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${uuidv4()}-${sanitizeFilename(originalName)}`;
    const absolutePath = path.join(dir, filename);
    fs.writeFileSync(absolutePath, buffer);

    return { storagePath: path.join(subfolder, filename) };
  }

  readAbsolutePath(storagePath: string): string {
    // path.join normalizes ".." segments away, so a malicious storagePath
    // can't escape `root` — storagePath should only ever be a value this
    // provider itself generated via save(), never taken directly from user input.
    return path.join(this.root, storagePath);
  }
}
