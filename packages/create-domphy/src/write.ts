import {
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export interface ScaffoldFile {
  path: string;
  contents: string;
}

function ensureDirectory(
  dir: string,
  stopAt: string,
  createdDirs: string[],
): void {
  if (dir === stopAt || existsSync(dir)) return;
  const parent = dirname(dir);
  if (parent !== dir) {
    ensureDirectory(parent, stopAt, createdDirs);
  }
  if (!existsSync(dir)) {
    mkdirSync(dir);
    createdDirs.push(dir);
  }
}

function rollbackScaffold(
  targetDir: string,
  targetDirExisted: boolean,
  writtenPaths: string[],
  createdDirs: string[],
): void {
  if (!targetDirExisted) {
    rmSync(targetDir, { recursive: true, force: true });
    return;
  }
  for (const writtenPath of writtenPaths) {
    rmSync(writtenPath, { force: true });
  }
  for (const dir of [...createdDirs].reverse()) {
    // Windows EBUSY: rmdir right after deleting a child file can fail.
    // Same retry pattern as tests/cli.test.ts afterAll (maxRetries: 5).
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  }
}

// Writes template files into targetDir. Existing files are left untouched so
// a user .gitignore (allowed by isDirectoryUsable) is not clobbered. On
// failure, newly written files AND directories this run created are removed
// so a retry is not blocked by leftover empty dirs such as src/.
export function writeScaffoldFiles(
  targetDir: string,
  files: ScaffoldFile[],
): void {
  const targetDirExisted = existsSync(targetDir);
  mkdirSync(targetDir, { recursive: true });

  const writtenPaths: string[] = [];
  const createdDirs: string[] = [];
  try {
    for (const file of files) {
      const fullPath = join(targetDir, file.path);
      ensureDirectory(dirname(fullPath), targetDir, createdDirs);
      if (existsSync(fullPath) && statSync(fullPath).isFile()) {
        continue;
      }
      writeFileSync(fullPath, file.contents, "utf8");
      writtenPaths.push(fullPath);
    }
  } catch (error) {
    rollbackScaffold(targetDir, targetDirExisted, writtenPaths, createdDirs);
    throw error;
  }
}
