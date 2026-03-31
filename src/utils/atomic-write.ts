import { writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  const tmpSuffix = randomBytes(6).toString('hex');
  const tmpPath = join(dir, `.tmp-${tmpSuffix}`);

  await writeFile(tmpPath, content, 'utf-8');
  await rename(tmpPath, filePath);
}
