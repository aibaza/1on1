import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

function getLeafKeys(obj: unknown, path = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return path ? [path] : [];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => getLeafKeys(v, path ? `${path}.${k}` : k));
}

const messagesDir = resolve(process.cwd(), 'messages');
const namespaces = readdirSync(`${messagesDir}/en`).filter(f => f.endsWith('.json'));

describe('Translation key parity (en to ro)', () => {
  for (const ns of namespaces) {
    it(`${ns}: en and ro have identical keys`, () => {
      const en = JSON.parse(readFileSync(`${messagesDir}/en/${ns}`, 'utf-8'));
      const ro = JSON.parse(readFileSync(`${messagesDir}/ro/${ns}`, 'utf-8'));
      const enKeys = new Set(getLeafKeys(en));
      const roKeys = new Set(getLeafKeys(ro));
      const missingInRo = [...enKeys].filter(k => !roKeys.has(k));
      const missingInEn = [...roKeys].filter(k => !enKeys.has(k));
      expect(missingInRo, `Keys in en/${ns} not in ro/${ns}: ${missingInRo.join(', ')}`).toEqual([]);
      expect(missingInEn, `Keys in ro/${ns} not in en/${ns}: ${missingInEn.join(', ')}`).toEqual([]);
    });
  }
});
