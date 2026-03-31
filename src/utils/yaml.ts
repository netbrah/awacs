import { readFile, writeFile } from 'node:fs/promises';
import YAML from 'yaml';
import { atomicWrite } from './atomic-write.js';

export async function readYaml<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return YAML.parse(content) as T;
}

export async function writeYaml(filePath: string, data: unknown): Promise<void> {
  const content = YAML.stringify(data, { lineWidth: 0 });
  await atomicWrite(filePath, content);
}

export { YAML };
